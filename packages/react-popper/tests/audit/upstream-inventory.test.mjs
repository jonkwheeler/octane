import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildInventory, compareInventories } from '../../audit/upstream-inventory.mjs';

const clone = (value) => structuredClone(value);

test('the pinned upstream inventory validates', async () => {
	const inventory = await buildInventory();
	compareInventories(inventory, clone(inventory));
	assert.equal(inventory.artifacts.length, 54);
	assert.equal(inventory.upstreamCases.length, 20);
});

test('fails closed when an upstream artifact is missing', async () => {
	const actual = await buildInventory();
	const expected = clone(actual);
	expected.artifacts.pop();
	assert.throws(() => compareInventories(actual, expected), /artifact inventory/);
});

test('fails closed when an upstream artifact checksum is stale', async () => {
	const actual = await buildInventory();
	const expected = clone(actual);
	expected.artifacts[0].sha256 = '0'.repeat(64);
	assert.throws(() => compareInventories(actual, expected), /artifact inventory/);
});

test('fails closed when an upstream case is renamed or missing', async () => {
	const actual = await buildInventory();
	const expected = clone(actual);
	expected.upstreamCases[0].name += ' renamed';
	assert.throws(() => compareInventories(actual, expected), /case inventory/);
});

test('fails closed when an executable mapping is changed', async () => {
	const actual = await buildInventory();
	const expected = clone(actual);
	expected.crosswalk[0].evidence = 'tests/runtime/missing.test.ts::missing';
	assert.throws(() => compareInventories(actual, expected), /crosswalk/);
});
