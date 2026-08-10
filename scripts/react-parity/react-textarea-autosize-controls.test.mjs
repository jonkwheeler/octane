import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
	discoverReactTextareaAutosizeClassifiedPaths,
	verifyReactTextareaAutosizeTestClassifications,
} from './react-textarea-autosize-classifications-lib.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));

function readJson(relativePath) {
	return JSON.parse(readFileSync(join(root, relativePath), 'utf8'));
}

function mappedAdaptedNames(crosswalk) {
	return new Set(
		crosswalk.cases.map(function name(entry) {
			return entry.adaptedFullName;
		}),
	);
}

function mappedUpstreamNames(crosswalk) {
	return new Set(
		crosswalk.cases.map(function name(entry) {
			return entry.upstreamFullName;
		}),
	);
}

test('react-textarea-autosize classifies every port-authored runtime/type test exactly once', () => {
	assert.deepEqual(verifyReactTextareaAutosizeTestClassifications(root), {
		tests: discoverReactTextareaAutosizeClassifiedPaths(root).length,
	});
});

test('rejects an unclassified port-authored react-textarea-autosize test', async (t) => {
	const fixtureRoot = await mkdtemp(join(tmpdir(), 'textarea-classifications-'));
	t.after(() => rm(fixtureRoot, { recursive: true, force: true }));
	await cp(
		join(root, 'packages/react-textarea-autosize/tests'),
		join(fixtureRoot, 'packages/react-textarea-autosize/tests'),
		{ recursive: true },
	);
	await cp(
		join(root, 'packages/react-textarea-autosize/audit'),
		join(fixtureRoot, 'packages/react-textarea-autosize/audit'),
		{ recursive: true },
	);
	await cp(
		join(root, 'packages/react-textarea-autosize/typetests'),
		join(fixtureRoot, 'packages/react-textarea-autosize/typetests'),
		{ recursive: true },
	);
	await writeFile(
		join(fixtureRoot, 'packages/react-textarea-autosize/tests/new.test.ts'),
		'export {};\n',
	);
	assert.throws(
		() => verifyReactTextareaAutosizeTestClassifications(fixtureRoot),
		/exactly one classification/,
	);
});

test('pristine→adapted crosswalk is exhaustive one-for-one', () => {
	const crosswalk = readJson('packages/react-textarea-autosize/audit/upstream-crosswalk.json');
	const pristine = readJson('packages/react-textarea-autosize/audit/pristine-runtime.json');
	const adapted = readJson('packages/react-textarea-autosize/audit/adapted-runtime.json');
	assert.equal(crosswalk.cases.length, pristine.tests.length);
	assert.equal(crosswalk.cases.length, adapted.tests.length);
	assert.deepEqual(
		[...mappedUpstreamNames(crosswalk)].sort(),
		pristine.tests.map((entry) => entry.fullName).sort(),
	);
	assert.deepEqual(
		[...mappedAdaptedNames(crosswalk)].sort(),
		adapted.tests.map((entry) => entry.fullName).sort(),
	);
	for (const entry of crosswalk.cases) {
		assert.equal(entry.status, 'ported');
		assert.ok(entry.upstreamFullName);
		assert.ok(entry.adaptedFullName);
		assert.notEqual(entry.upstreamFullName, entry.adaptedFullName);
	}
});

test('removing a crosswalk mapping fails one-for-one validation', () => {
	const crosswalk = readJson('packages/react-textarea-autosize/audit/upstream-crosswalk.json');
	const pristine = readJson('packages/react-textarea-autosize/audit/pristine-runtime.json');
	const truncated = { ...crosswalk, cases: crosswalk.cases.slice(1) };
	const missing = pristine.tests.filter(function absent(testCase) {
		return !mappedUpstreamNames(truncated).has(testCase.fullName);
	});
	assert.ok(missing.length > 0);
});

test('renaming an adapted inventory identity breaks the crosswalk', () => {
	const crosswalk = readJson('packages/react-textarea-autosize/audit/upstream-crosswalk.json');
	const adapted = readJson('packages/react-textarea-autosize/audit/adapted-runtime.json');
	const renamed = {
		...adapted,
		tests: adapted.tests.map(function renameFirst(testCase, index) {
			if (index !== 0) return testCase;
			return { ...testCase, fullName: `${testCase.fullName} renamed` };
		}),
	};
	const missing = renamed.tests.filter(function absent(testCase) {
		return !mappedAdaptedNames(crosswalk).has(testCase.fullName);
	});
	assert.ok(missing.length > 0);
});

test('stale adapted source path in the crosswalk is rejected', () => {
	const crosswalk = readJson('packages/react-textarea-autosize/audit/upstream-crosswalk.json');
	const adapted = readJson('packages/react-textarea-autosize/audit/adapted-runtime.json');
	const adaptedFiles = new Set(adapted.files);
	for (const entry of crosswalk.cases) {
		assert.ok(
			adaptedFiles.has(entry.adaptedFile),
			`crosswalk adaptedFile must exist in adapted inventory: ${entry.adaptedFile}`,
		);
	}
	const stale = {
		...crosswalk,
		cases: crosswalk.cases.map(function poison(entry, index) {
			if (index !== 0) return entry;
			return { ...entry, adaptedFile: 'packages/react-textarea-autosize/tests/missing.test.ts' };
		}),
	};
	assert.equal(
		adaptedFiles.has(stale.cases[0].adaptedFile),
		false,
		'stale adapted source must fail membership',
	);
});

test('adapted inventory rename breaks crosswalk membership', () => {
	const crosswalk = readJson('packages/react-textarea-autosize/audit/upstream-crosswalk.json');
	const adapted = readJson('packages/react-textarea-autosize/audit/adapted-runtime.json');
	const renamedNames = new Set(
		adapted.tests.map(function rename(entry, index) {
			return index === 0 ? `${entry.fullName} renamed` : entry.fullName;
		}),
	);
	const missing = crosswalk.cases.filter(function absent(entry) {
		return !renamedNames.has(entry.adaptedFullName);
	});
	assert.ok(missing.length > 0);
});

test('omitting an adapted inventory identity leaves a pristine case unmapped', () => {
	const crosswalk = readJson('packages/react-textarea-autosize/audit/upstream-crosswalk.json');
	const adapted = readJson('packages/react-textarea-autosize/audit/adapted-runtime.json');
	const truncated = { ...adapted, tests: adapted.tests.slice(1) };
	const adaptedNames = new Set(truncated.tests.map((entry) => entry.fullName));
	const missing = crosswalk.cases.filter(function absent(entry) {
		return !adaptedNames.has(entry.adaptedFullName);
	});
	assert.ok(missing.length > 0);
});
