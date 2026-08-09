import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';

import {
	collectUpstreamCaseInventory,
	verifyReactTransitionGroupUpstream,
} from './react-transition-group-upstream-lib.mjs';

async function fixture() {
	const root = await mkdtemp(join(tmpdir(), 'rtg-upstream-'));
	await cp(
		new URL('../../packages/react-transition-group/upstream', import.meta.url),
		join(root, 'packages/react-transition-group/upstream'),
		{ recursive: true },
	);
	for (const file of ['SHA256SUMS', 'upstream-test-dispositions.json']) {
		await cp(
			new URL(`../../packages/react-transition-group/audit/${file}`, import.meta.url),
			join(root, `packages/react-transition-group/audit/${file}`),
		);
	}
	return root;
}

test('accepts the committed upstream dispositions and case inventory', async function acceptsCommitted(t) {
	const root = await fixture();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	const summary = verifyReactTransitionGroupUpstream(root);
	assert.equal(summary.artifacts, 11);
	assert.equal(summary.cases, collectUpstreamCaseInventory(root).length);
	assert.ok(summary.cases > 0);
});

test('rejects a missing upstream test artifact disposition', async function rejectsMissingDisposition(t) {
	const root = await fixture();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	const path = join(root, 'packages/react-transition-group/audit/upstream-test-dispositions.json');
	const config = JSON.parse(await readFile(path, 'utf8'));
	config.artifacts = config.artifacts.filter(function keep(entry) {
		return entry.path !== 'SSR-test.js';
	});
	await writeFile(path, `${JSON.stringify(config)}\n`);
	assert.throws(function run() {
		verifyReactTransitionGroupUpstream(root);
	}, /must account for every upstream\/test artifact/);
});

test('rejects a stale caseCount for an upstream suite', async function rejectsStaleCaseCount(t) {
	const root = await fixture();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	const path = join(root, 'packages/react-transition-group/audit/upstream-test-dispositions.json');
	const config = JSON.parse(await readFile(path, 'utf8'));
	config.artifacts.find(function findSsr(entry) {
		return entry.path === 'SSR-test.js';
	}).caseCount = 0;
	await writeFile(path, `${JSON.stringify(config)}\n`);
	assert.throws(function run() {
		verifyReactTransitionGroupUpstream(root);
	}, /caseCount|case inventory drifted/);
});

test('rejects removal of an upstream suite case', async function rejectsRemovedCase(t) {
	const root = await fixture();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	const suitePath = join(root, 'packages/react-transition-group/upstream/test/SSR-test.js');
	await writeFile(
		suitePath,
		`/**
 * @jest-environment node
 */

import * as ReactTransitionGroup from '../src'; // eslint-disable-line no-unused-vars

describe('SSR', () => {});
`,
	);
	const { renderReactTransitionGroupUpstreamInventory } =
		await import('./react-transition-group-upstream-lib.mjs');
	await writeFile(
		join(root, 'packages/react-transition-group/audit/SHA256SUMS'),
		renderReactTransitionGroupUpstreamInventory(root),
	);
	assert.throws(function run() {
		verifyReactTransitionGroupUpstream(root);
	}, /caseCount|case inventory drifted/);
});

test('rejects a deleted upstream suite file', async function rejectsDeletedSuite(t) {
	const root = await fixture();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	await rm(join(root, 'packages/react-transition-group/upstream/test/SSR-test.js'));
	const { renderReactTransitionGroupUpstreamInventory } =
		await import('./react-transition-group-upstream-lib.mjs');
	await writeFile(
		join(root, 'packages/react-transition-group/audit/SHA256SUMS'),
		renderReactTransitionGroupUpstreamInventory(root),
	);
	assert.throws(function run() {
		verifyReactTransitionGroupUpstream(root);
	}, /must account for every upstream\/test artifact/);
});
