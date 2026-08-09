import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
	assertAdaptedSourceExecutable,
	assertRuntimeCrosswalk,
	assertRuntimeStructureCrosswalk,
	fixtureFileFingerprint,
} from './alien-signals-runtime-lib.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

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
		structure: null,
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

test('rejects Vitest it.fails adapted registrations', function rejectsFailsRegistration() {
	assert.throws(function run() {
		assertAdaptedSourceExecutable("it.fails('suite case a', function () {});\n");
	}, /failing\/fails, skip, or todo markers/);
});

test('accepts the committed adapted assertion and fixture structure', function acceptsCommittedStructure() {
	const pristineSource = readFileSync(
		resolve(root, 'packages/alien-signals/upstream/src/index.test.ts'),
		'utf8',
	);
	const adaptedSource = readFileSync(
		resolve(root, 'packages/alien-signals/tests/upstream-adapted.test.ts'),
		'utf8',
	);
	const fixtureSource = readFileSync(
		resolve(root, 'packages/alien-signals/tests/_fixtures/hooks.tsrx'),
		'utf8',
	);
	const result = assertRuntimeStructureCrosswalk({
		pristineSource,
		adaptedSource,
		fixtureSource,
		repoRoot: root,
	});
	assert.equal(result.cases > 0, true);
	assert.equal(result.fixtures > 0, true);
});

test('rejects deleting an adapted expect assertion', function rejectsDeletedAssertion() {
	const pristineSource = readFileSync(
		resolve(root, 'packages/alien-signals/upstream/src/index.test.ts'),
		'utf8',
	);
	const adaptedSource = readFileSync(
		resolve(root, 'packages/alien-signals/tests/upstream-adapted.test.ts'),
		'utf8',
	);
	const fixtureSource = readFileSync(
		resolve(root, 'packages/alien-signals/tests/_fixtures/hooks.tsrx'),
		'utf8',
	);
	const weakened = adaptedSource.replace(
		'expect(mySignal()).toBe(0);\n\t\tmySignal(10);\n\t\texpect(mySignal()).toBe(10);',
		'mySignal(10);\n\t\texpect(mySignal()).toBe(10);',
	);
	assert.notEqual(weakened, adaptedSource);
	assert.throws(function run() {
		assertRuntimeStructureCrosswalk({
			pristineSource,
			adaptedSource: weakened,
			fixtureSource,
			repoRoot: root,
		});
	}, /runtime assertion drift/);
});

test('rejects a weakened expect receiver', function rejectsWeakenedReceiver() {
	const pristineSource = readFileSync(
		resolve(root, 'packages/alien-signals/upstream/src/index.test.ts'),
		'utf8',
	);
	const adaptedSource = readFileSync(
		resolve(root, 'packages/alien-signals/tests/upstream-adapted.test.ts'),
		'utf8',
	);
	const fixtureSource = readFileSync(
		resolve(root, 'packages/alien-signals/tests/_fixtures/hooks.tsrx'),
		'utf8',
	);
	const weakened = adaptedSource.replace(
		'expect(mySignal()).toBe(0);\n\t\tmySignal(10);\n\t\texpect(mySignal()).toBe(10);',
		'expect(0).toBe(0);\n\t\tmySignal(10);\n\t\texpect(mySignal()).toBe(10);',
	);
	assert.notEqual(weakened, adaptedSource);
	assert.throws(function run() {
		assertRuntimeStructureCrosswalk({
			pristineSource,
			adaptedSource: weakened,
			fixtureSource,
			repoRoot: root,
		});
	}, /runtime assertion drift/);
});

test('rejects a missing Per citation', function rejectsMissingCitation() {
	const pristineSource = readFileSync(
		resolve(root, 'packages/alien-signals/upstream/src/index.test.ts'),
		'utf8',
	);
	const adaptedSource = readFileSync(
		resolve(root, 'packages/alien-signals/tests/upstream-adapted.test.ts'),
		'utf8',
	);
	const fixtureSource = readFileSync(
		resolve(root, 'packages/alien-signals/tests/_fixtures/hooks.tsrx'),
		'utf8',
	);
	const stripped = adaptedSource.replace(
		"\t// Per src/index.test.ts:31\n\tit('should create a writable signal'",
		"\tit('should create a writable signal'",
	);
	assert.notEqual(stripped, adaptedSource);
	assert.throws(function run() {
		assertRuntimeStructureCrosswalk({
			pristineSource,
			adaptedSource: stripped,
			fixtureSource,
			repoRoot: root,
		});
	}, /missing a \/\/ Per src\/index\.test\.ts:<line> citation/);
});

test('rejects fixture file drift against the transformation ledger', function rejectsFixtureDrift() {
	const pristineSource = readFileSync(
		resolve(root, 'packages/alien-signals/upstream/src/index.test.ts'),
		'utf8',
	);
	const adaptedSource = readFileSync(
		resolve(root, 'packages/alien-signals/tests/upstream-adapted.test.ts'),
		'utf8',
	);
	const fixtureSource = readFileSync(
		resolve(root, 'packages/alien-signals/tests/_fixtures/hooks.tsrx'),
		'utf8',
	);
	const drifted = `${fixtureSource}\n`;
	assert.notEqual(fixtureFileFingerprint(drifted), fixtureFileFingerprint(fixtureSource));
	assert.throws(function run() {
		assertRuntimeStructureCrosswalk({
			pristineSource,
			adaptedSource,
			fixtureSource: drifted,
			repoRoot: root,
		});
	}, /fixture drift/);
});

test('rejects semantic fixture drift even when the ledger sha256 is updated', function rejectsSemanticFixtureDrift() {
	const pristineSource = readFileSync(
		resolve(root, 'packages/alien-signals/upstream/src/index.test.ts'),
		'utf8',
	);
	const adaptedSource = readFileSync(
		resolve(root, 'packages/alien-signals/tests/upstream-adapted.test.ts'),
		'utf8',
	);
	const fixtureSource = readFileSync(
		resolve(root, 'packages/alien-signals/tests/_fixtures/hooks.tsrx'),
		'utf8',
	);
	const mutated = fixtureSource.replaceAll('id="value"', 'id="renamed-value"');
	assert.notEqual(mutated, fixtureSource);
	assert.throws(function run() {
		assertRuntimeStructureCrosswalk({
			pristineSource,
			adaptedSource,
			fixtureSource: mutated,
			expectedFixtureSha256: fixtureFileFingerprint(mutated),
		});
	}, /semantic fixture drift/);
});

test('rejects replacing hook-driven clicks with direct source mutation', function rejectsHookBypass() {
	const pristineSource = readFileSync(
		resolve(root, 'packages/alien-signals/upstream/src/index.test.ts'),
		'utf8',
	);
	const adaptedSource = readFileSync(
		resolve(root, 'packages/alien-signals/tests/upstream-adapted.test.ts'),
		'utf8',
	);
	const fixtureSource = readFileSync(
		resolve(root, 'packages/alien-signals/tests/_fixtures/hooks.tsrx'),
		'utf8',
	);
	const bypassed = adaptedSource.replace(
		"\tit('useSetSignal should return setter only', function useSetSignalShouldReturnSetterOnly() {\n\t\tconst countSignal = createSignal(0);\n\t\tconst result = mount(SetterOnly, { source: countSignal });\n\t\tresult.click('#set');\n\t\texpect(countSignal()).toBe(10);\n\t\tresult.click('#inc');\n\t\texpect(countSignal()).toBe(15);\n\t\tresult.unmount();\n\t});",
		"\tit('useSetSignal should return setter only', function useSetSignalShouldReturnSetterOnly() {\n\t\tconst countSignal = createSignal(0);\n\t\tconst result = mount(SetterOnly, { source: countSignal });\n\t\tcountSignal(10);\n\t\texpect(countSignal()).toBe(10);\n\t\tcountSignal(15);\n\t\texpect(countSignal()).toBe(15);\n\t\tresult.unmount();\n\t});",
	);
	assert.notEqual(bypassed, adaptedSource);
	assert.throws(function run() {
		assertRuntimeStructureCrosswalk({
			pristineSource,
			adaptedSource: bypassed,
			fixtureSource,
			repoRoot: root,
		});
	}, /bypasses .* hook-surface transition/);
});
