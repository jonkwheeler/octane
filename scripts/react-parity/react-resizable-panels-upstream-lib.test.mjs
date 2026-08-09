import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
	expectedAdaptedAssertionGroups,
	extractAssertionGroups,
	verifyReactResizablePanelsUpstream,
} from './react-resizable-panels-upstream-lib.mjs';

const repo = join(import.meta.dirname, '../..');

test('pristine-to-adapted assertion mapping covers the pinned suite', function coversPinnedSuite() {
	const result = verifyReactResizablePanelsUpstream(repo);
	assert.equal(result.artifacts, 29);
	assert.equal(result.upstreamCases, result.portedCases);
	assert.ok(result.assertionGroups > 0);
	assert.ok(result.permittedTransformations > 0);
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
