import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { cpSync } from 'node:fs';
import test from 'node:test';
import { verifyReactResizablePanelsTestClassifications } from './react-resizable-panels-classifications-lib.mjs';

const repo = join(import.meta.dirname, '../..');

async function fixture() {
	const root = await mkdtemp(join(tmpdir(), 'rrp-classifications-'));
	cpSync(
		join(repo, 'packages/react-resizable-panels/tests'),
		join(root, 'packages/react-resizable-panels/tests'),
		{ recursive: true },
	);
	for (const file of ['test-classifications.json', 'react-parity.json', 'test-inventory.json']) {
		cpSync(
			join(repo, 'packages/react-resizable-panels/audit', file),
			join(root, 'packages/react-resizable-panels/audit', file),
		);
	}
	return root;
}

test('accepts the pinned port-authored and adapted upstream sets', function acceptsPinned() {
	const result = verifyReactResizablePanelsTestClassifications(repo);
	assert.equal(result.tests, 6);
	assert.equal(result.adaptedUpstreamSuites, 29);
});

test('rejects an extra adapted upstream file absent from inventory adaptedPath', async function rejectsExtra(t) {
	const root = await fixture();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	await writeFile(
		join(root, 'packages/react-resizable-panels/tests/upstream/extra-unlisted.test.ts'),
		"test('unlisted', () => {})\n",
	);
	assert.throws(function run() {
		verifyReactResizablePanelsTestClassifications(root);
	}, /adaptedPath set/);
});
