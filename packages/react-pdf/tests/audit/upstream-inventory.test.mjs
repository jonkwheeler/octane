import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildInventory, compareInventories } from '../../audit/upstream-inventory.mjs';

const clone = (value) => structuredClone(value);

test('the pinned React PDF authorities and case crosswalk validate', async () => {
	const inventory = await buildInventory();
	compareInventories(inventory, clone(inventory));
	assert.equal(inventory.artifacts.length, 144);
	assert.equal(inventory.upstreamCases.length, 182);
});

test('fails closed when an upstream artifact is missing', async () => {
	const actual = await buildInventory();
	const expected = clone(actual);
	expected.artifacts.pop();
	assert.throws(() => compareInventories(actual, expected), /artifact inventory/);
});

test('fails closed when an upstream checksum is stale', async () => {
	const actual = await buildInventory();
	const expected = clone(actual);
	expected.artifacts[0].sha256 = '0'.repeat(64);
	assert.throws(() => compareInventories(actual, expected), /artifact inventory/);
});

test('fails closed when an upstream case is renamed or omitted', async () => {
	const actual = await buildInventory();
	const expected = clone(actual);
	expected.upstreamCases[0].name += ' renamed';
	assert.throws(() => compareInventories(actual, expected), /case inventory/);
});

test('fails closed when an executable mapping changes', async () => {
	const actual = await buildInventory();
	const expected = clone(actual);
	expected.crosswalk[0].evidence = 'tests/runtime/missing.test.ts::missing';
	assert.throws(() => compareInventories(actual, expected), /crosswalk/);
});

test('fails closed when the public surface changes', async () => {
	const actual = await buildInventory();
	const expected = clone(actual);
	expected.publicSurface.runtimeExports.pop();
	assert.throws(() => compareInventories(actual, expected), /public surface/);
});
