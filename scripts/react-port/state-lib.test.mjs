import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';
import {
	acquireBatchLock,
	createBatchManifest,
	detectWorktreeCollisions,
	invalidateChangedEvidence,
	releaseBatchLock,
	reconcileBatchManifest,
	transitionNodeState,
	validateBatchManifest,
	writeManifestAtomically,
} from './state-lib.mjs';

function fixtureManifest() {
	return createBatchManifest({
		batchId: 'fixture-batch',
		inventoryFingerprint: 'inventory-a',
		executionUnits: [['pkg:base'], ['pkg:leaf'], ['pkg:other']],
		actionableExecutionUnits: [['pkg:leaf']],
		executionOrder: ['pkg:base', 'pkg:leaf', 'pkg:other'],
		nodes: {
			'pkg:base': { state: 'verified', evidenceFingerprint: 'base-a', dependsOn: [] },
			'pkg:leaf': { state: 'verified', evidenceFingerprint: 'leaf-a', dependsOn: ['pkg:base'] },
			'pkg:other': { state: 'verified', evidenceFingerprint: 'other-a', dependsOn: [] },
		},
		baseline: { 'packages/fixture/package.json': 'hash-a' },
	});
}

describe('batch state', () => {
	test('persists graph execution metadata and resumes schema-v1 manifests that predate it', () => {
		const next = fixtureManifest();
		assert.deepEqual(next.executionUnits, [['pkg:base'], ['pkg:leaf'], ['pkg:other']]);
		assert.deepEqual(next.actionableExecutionUnits, [['pkg:leaf']]);
		assert.deepEqual(next.executionOrder, ['pkg:base', 'pkg:leaf', 'pkg:other']);

		const legacy = structuredClone(next);
		delete legacy.executionUnits;
		delete legacy.actionableExecutionUnits;
		delete legacy.executionOrder;
		assert.equal(validateBatchManifest(legacy), legacy);

		const resumed = reconcileBatchManifest(legacy, next);
		assert.deepEqual(resumed.executionUnits, next.executionUnits);
		assert.deepEqual(resumed.actionableExecutionUnits, next.actionableExecutionUnits);
		assert.deepEqual(resumed.executionOrder, next.executionOrder);
		assert.deepEqual(resumed.resume.invalidated, []);
	});

	test('rejects unknown schemas and non-monotonic transitions', () => {
		assert.throws(() => validateBatchManifest({ schemaVersion: 2 }), /newer schema/i);
		const manifest = createBatchManifest({
			batchId: 'transition',
			inventoryFingerprint: 'inventory',
			nodes: { 'pkg:x': { state: 'resolved', evidenceFingerprint: 'same', dependsOn: [] } },
		});
		transitionNodeState(manifest, 'pkg:x', 'licensed', { evidenceFingerprint: 'same' });
		assert.throws(
			() => transitionNodeState(manifest, 'pkg:x', 'verified', { evidenceFingerprint: 'same' }),
			/transition/i,
		);
	});

	test('invalidates only changed evidence and its dependents', () => {
		const manifest = fixtureManifest();
		const invalidated = invalidateChangedEvidence(manifest, {
			'pkg:base': 'base-b',
			'pkg:leaf': 'leaf-a',
			'pkg:other': 'other-a',
		});

		assert.deepEqual(invalidated, ['pkg:base', 'pkg:leaf']);
		assert.equal(manifest.nodes['pkg:base'].state, 'resolved');
		assert.equal(manifest.nodes['pkg:leaf'].state, 'resolved');
		assert.equal(manifest.nodes['pkg:other'].state, 'verified');
	});

	test('preserves completed nodes only when their plan and upstream evidence are unchanged', () => {
		const previous = fixtureManifest();
		for (const node of Object.values(previous.nodes))
			node.nodeFingerprint = `${node.evidenceFingerprint}-plan`;
		const next = fixtureManifest();
		for (const node of Object.values(next.nodes))
			node.nodeFingerprint = `${node.evidenceFingerprint}-plan`;
		next.nodes['pkg:base'].evidenceFingerprint = 'base-b';
		next.nodes['pkg:base'].state = 'ready';
		next.nodes['pkg:leaf'].state = 'ready';

		const resumed = reconcileBatchManifest(previous, next);
		assert.equal(resumed.nodes['pkg:base'].state, 'ready');
		assert.equal(resumed.nodes['pkg:leaf'].state, 'ready');
		assert.equal(resumed.nodes['pkg:other'].state, 'verified');
		assert.deepEqual(resumed.resume.invalidated, ['pkg:base', 'pkg:leaf']);
	});

	test('detects overlapping writes without treating unrelated worktree changes as collisions', () => {
		assert.deepEqual(
			detectWorktreeCollisions({
				plannedPaths: ['packages/fixture/package.json'],
				baseline: {
					'packages/fixture/package.json': 'old',
					'docs/unrelated.md': 'old-doc',
				},
				current: {
					'packages/fixture/package.json': 'changed',
					'docs/unrelated.md': 'changed-doc',
				},
			}),
			['packages/fixture/package.json'],
		);
	});

	test('uses one-writer locks and atomic manifest replacement', async () => {
		const directory = await mkdtemp(path.join(tmpdir(), 'react-port-state-'));
		const lock = await acquireBatchLock(directory, { owner: 'test-owner' });
		await assert.rejects(() => acquireBatchLock(directory, { owner: 'second-owner' }), /locked/i);

		const manifest = fixtureManifest();
		await writeManifestAtomically(directory, manifest, { owner: 'test-owner' });
		assert.deepEqual(
			JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8')),
			manifest,
		);
		await assert.rejects(() => stat(path.join(directory, 'manifest.json.tmp')));
		await releaseBatchLock(lock);
	});

	test('recovers a stale lock only through the explicit recovery path', async () => {
		const directory = await mkdtemp(path.join(tmpdir(), 'react-port-stale-lock-'));
		await acquireBatchLock(directory, { owner: 'abandoned', now: 1_000 });
		await assert.rejects(
			() => acquireBatchLock(directory, { owner: 'replacement', now: 10_000, staleAfterMs: 1_000 }),
			/locked/i,
		);
		const replacement = await acquireBatchLock(directory, {
			owner: 'replacement',
			now: 10_000,
			staleAfterMs: 1_000,
			allowStaleRecovery: true,
		});
		assert.ok((await readdir(directory)).some((file) => file.startsWith('.lock.stale.')));
		await releaseBatchLock(replacement);
	});
});
