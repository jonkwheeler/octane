import assert from 'node:assert/strict';
import test from 'node:test';

import {
	assertAdaptedSourceExecutable,
	assertRuntimeCrosswalk,
} from './alien-signals-runtime-lib.mjs';

function inventory(titles) {
	return {
		tests: titles.map(function toTest(fullName) {
			return { file: 'example.test.ts', fullName };
		}),
	};
}

test('accepts matching pristine and adapted titles', function acceptsMatchingTitles() {
	const titles = [
		'Alien React Library should create a writable signal',
		'Alien React Library should create a signal scope',
	];
	assert.deepEqual(assertRuntimeCrosswalk(inventory(titles), inventory(titles)), {
		titles: 2,
	});
});

test('rejects an omitted adapted title', function rejectsOmittedTitle() {
	assert.throws(function run() {
		assertRuntimeCrosswalk(
			inventory(['suite case a', 'suite case b']),
			inventory(['suite case a']),
		);
	}, /missing adapted titles: suite case b/);
});

test('rejects a renamed adapted title', function rejectsRenamedTitle() {
	assert.throws(function run() {
		assertRuntimeCrosswalk(
			inventory(['suite case a', 'suite case b']),
			inventory(['suite case a', 'suite case b renamed']),
		);
	}, /not one-for-one by title/);
});

test('rejects skipped adapted registrations', function rejectsSkippedRegistration() {
	assert.throws(function run() {
		assertAdaptedSourceExecutable("it.skip('suite case a', function () {});\n");
	}, /skip, or todo markers/);
});
