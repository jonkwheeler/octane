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
import { verifyReactTextareaAutosizeCrosswalk } from './react-textarea-autosize-crosswalk-lib.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));

function readJson(relativePath) {
	return JSON.parse(readFileSync(join(root, relativePath), 'utf8'));
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
	assert.deepEqual(verifyReactTextareaAutosizeCrosswalk(root), { cases: 2 });
});

test('removing a crosswalk mapping fails verification', () => {
	const crosswalk = readJson('packages/react-textarea-autosize/audit/upstream-crosswalk.json');
	assert.throws(
		() =>
			verifyReactTextareaAutosizeCrosswalk(root, {
				crosswalk: { ...crosswalk, cases: crosswalk.cases.slice(1) },
			}),
		/case count must match pristine inventory|has no crosswalk mapping/,
	);
});

test('renaming an adapted inventory identity fails verification', () => {
	const adapted = readJson('packages/react-textarea-autosize/audit/adapted-runtime.json');
	assert.throws(
		() =>
			verifyReactTextareaAutosizeCrosswalk(root, {
				adapted: {
					...adapted,
					tests: adapted.tests.map(function renameFirst(testCase, index) {
						if (index !== 0) return testCase;
						return { ...testCase, fullName: `${testCase.fullName} renamed` };
					}),
				},
			}),
		/missing from adapted inventory|has no crosswalk mapping/,
	);
});

test('stale adapted source path in the crosswalk fails verification', () => {
	const crosswalk = readJson('packages/react-textarea-autosize/audit/upstream-crosswalk.json');
	assert.throws(
		() =>
			verifyReactTextareaAutosizeCrosswalk(root, {
				crosswalk: {
					...crosswalk,
					cases: crosswalk.cases.map(function poison(entry, index) {
						if (index !== 0) return entry;
						return {
							...entry,
							adaptedFile: 'packages/react-textarea-autosize/tests/missing.test.ts',
						};
					}),
				},
			}),
		/adaptedFile missing from adapted inventory files/,
	);
});

test('omitting an adapted inventory identity fails verification', () => {
	const adapted = readJson('packages/react-textarea-autosize/audit/adapted-runtime.json');
	assert.throws(
		() =>
			verifyReactTextareaAutosizeCrosswalk(root, {
				adapted: { ...adapted, tests: adapted.tests.slice(1) },
			}),
		/case count must match adapted inventory|missing from adapted inventory/,
	);
});

test('skipping an adapted inventory file entry fails verification', () => {
	const adapted = readJson('packages/react-textarea-autosize/audit/adapted-runtime.json');
	assert.throws(
		() =>
			verifyReactTextareaAutosizeCrosswalk(root, {
				adapted: { ...adapted, files: [] },
			}),
		/adaptedFile missing from adapted inventory files/,
	);
});
