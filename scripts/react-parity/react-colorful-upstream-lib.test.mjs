import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	buildInventory,
	compareInventories,
	verifyReactColorfulUpstream,
} from './react-colorful-upstream-lib.mjs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const clone = (value) => structuredClone(value);

test('the pinned upstream inventory validates through the always-on control plane', async () => {
	const result = await verifyReactColorfulUpstream(REPO);
	assert.equal(result.artifacts, 72);
	assert.equal(result.upstreamCases, 64);
});

test('fails closed when an upstream artifact is missing', async () => {
	const actual = await buildInventory(resolve(REPO, 'packages/react-colorful'));
	const expected = clone(actual);
	expected.artifacts.pop();
	assert.throws(() => compareInventories(actual, expected), /artifact inventory/);
});

test('fails closed when an upstream artifact checksum is stale', async () => {
	const actual = await buildInventory(resolve(REPO, 'packages/react-colorful'));
	const expected = clone(actual);
	expected.artifacts[0].sha256 = '0'.repeat(64);
	assert.throws(() => compareInventories(actual, expected), /artifact inventory/);
});

test('fails closed when an upstream case is renamed or missing', async () => {
	const actual = await buildInventory(resolve(REPO, 'packages/react-colorful'));
	const expected = clone(actual);
	expected.upstreamCases[0].name += ' renamed';
	assert.throws(() => compareInventories(actual, expected), /case inventory/);
});

test('fails closed when a case mapping is duplicated or changed', async () => {
	const actual = await buildInventory(resolve(REPO, 'packages/react-colorful'));
	const expected = clone(actual);
	expected.crosswalk[0].evidence = 'tests/runtime/missing.test.ts::duplicate';
	assert.throws(() => compareInventories(actual, expected), /crosswalk/);
});
