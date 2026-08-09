import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
	compareRuntimeIdentityMultisets,
	expectedAdaptedAssertionGroups,
	expectedAdaptedCaseLedger,
	extractAssertionGroups,
	extractCaseLedger,
	mapPristineFileToAdapted,
	runtimeIdentityMultiset,
	verifyReactResizablePanelsUpstream,
} from './react-resizable-panels-upstream-lib.mjs';

const repo = join(import.meta.dirname, '../..');

function readRepo(relativePath) {
	return readFileSync(join(repo, relativePath), 'utf8');
}

test('pristine-to-adapted case ledger covers the pinned suite', function coversPinnedSuite() {
	const result = verifyReactResizablePanelsUpstream(repo);
	assert.equal(result.artifacts, 29);
	assert.equal(result.upstreamCases, result.portedCases);
	assert.equal(result.runtimeIdentities, 426);
	assert.ok(result.assertionGroups > 0);
	assert.ok(result.permittedTransformations > 0);
});

test('runtime inventories match one-for-one after explicit path mapping', function crosswalk() {
	const pristine = JSON.parse(
		readRepo('packages/react-resizable-panels/audit/pristine-runtime.json'),
	);
	const adapted = JSON.parse(
		readRepo('packages/react-resizable-panels/audit/adapted-runtime.json'),
	);
	const expected = runtimeIdentityMultiset(pristine, mapPristineFileToAdapted);
	const actual = runtimeIdentityMultiset(adapted, function identity(file) {
		return file;
	});
	const diff = compareRuntimeIdentityMultisets(expected, actual);
	assert.deepEqual(diff.missing, []);
	assert.deepEqual(diff.unexpected, []);
});

test('hierarchy drift fails full-name case keys even when leaf titles stay equal', function hierarchyDrift() {
	const adapted = readRepo('packages/react-resizable-panels/tests/upstream/hooks/useId.test.ts');
	const baseline = extractCaseLedger(adapted, 'hooks/useId.test.ts');
	const renamedDescribe = adapted.replace("describe('useId'", "describe('useIdRenamed'");
	const drifted = extractCaseLedger(renamedDescribe, 'hooks/useId.test.ts');
	assert.deepEqual(
		drifted.map(function titleOf(entry) {
			return entry.title;
		}),
		baseline.map(function titleOf(entry) {
			return entry.title;
		}),
	);
	assert.notDeepEqual(
		drifted.map(function nameOf(entry) {
			return entry.fullName;
		}),
		baseline.map(function nameOf(entry) {
			return entry.fullName;
		}),
	);
});

test('deleting an adapted assertion fails the pristine mapping', async function rejectsDeletedAssertion(t) {
	const root = await mkdtemp(join(tmpdir(), 'rrp-upstream-'));
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	const file = join(
		repo,
		'packages/react-resizable-panels/tests/upstream/utils/isArrayEqual.test.ts',
	);
	const upstream = await readFile(
		join(repo, 'packages/react-resizable-panels/upstream/source/lib/utils/isArrayEqual.test.ts'),
		'utf8',
	);
	const adapted = await readFile(file, 'utf8');
	const expected = expectedAdaptedAssertionGroups('utils/isArrayEqual.test.ts', upstream);
	assert.deepEqual(extractAssertionGroups(adapted, 'utils/isArrayEqual.test.ts'), expected);
	const weakened = adapted.replace(/\n\s*expect\([^;]+;/, '\n');
	assert.notDeepEqual(extractAssertionGroups(weakened, 'utils/isArrayEqual.test.ts'), expected);
	await writeFile(join(root, 'probe.txt'), weakened);
});

test('moving an assertion between cases fails case-keyed mapping', function rejectsMovedAssertion() {
	const upstream = readRepo(
		'packages/react-resizable-panels/upstream/source/lib/utils/isArrayEqual.test.ts',
	);
	const adapted = readRepo(
		'packages/react-resizable-panels/tests/upstream/utils/isArrayEqual.test.ts',
	);
	const expected = expectedAdaptedCaseLedger('utils/isArrayEqual.test.ts', upstream);
	const actual = extractCaseLedger(adapted, 'utils/isArrayEqual.test.ts');
	assert.equal(actual.length, 1);
	const withSibling = adapted.replace(
		"describe('isArrayEqual', () => {\n\ttest('should work', () => {\n\t\texpect(isArrayEqual([1, 2], [1])).toBe(false);\n",
		"describe('isArrayEqual', () => {\n\ttest('sibling', () => {\n\t\texpect(isArrayEqual([1, 2], [1])).toBe(false);\n\t});\n\ttest('should work', () => {\n",
	);
	const drifted = extractCaseLedger(withSibling, 'utils/isArrayEqual.test.ts');
	assert.notEqual(drifted.length, expected.length);
	const originalCase = drifted.find(function find(entry) {
		return entry.fullName === 'isArrayEqual should work';
	});
	assert.ok(originalCase);
	assert.notDeepEqual(originalCase.assertions, expected[0].assertions);
});

test('replacing an interaction with direct state mutation fails scenario structure', function rejectsStateMutation() {
	const adapted = readRepo(
		'packages/react-resizable-panels/tests/upstream/hooks/useStableCallback.test.tsrx',
	);
	const cases = extractCaseLedger(adapted, 'hooks/useStableCallback.test.tsrx');
	const target = cases.find(function find(entry) {
		return entry.scenarioSteps.some(function hasClick(step) {
			return step.includes('fireEvent.click');
		});
	});
	assert.ok(target, 'expected a fireEvent.click scenario step');
	const mutated = adapted.replace(/fireEvent\.click\([^;]+;/, 'result.current = () => {};');
	const drifted = extractCaseLedger(mutated, 'hooks/useStableCallback.test.tsrx');
	const driftedCase = drifted.find(function find(entry) {
		return entry.fullName === target.fullName;
	});
	assert.ok(driftedCase);
	assert.notDeepEqual(driftedCase.scenarioSteps, target.scenarioSteps);
	assert.ok(
		driftedCase.scenarioSteps.some(function hasMutation(step) {
			return step.includes('result.current =');
		}),
	);
});
