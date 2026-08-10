import assert from 'node:assert/strict';
import { mkdtemp, cp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { verifyReactTransitionGroupTestClassifications } from './react-transition-group-classifications-lib.mjs';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));

test('accepts the committed react-transition-group classifications', function acceptsCommitted() {
	assert.equal(typeof verifyReactTransitionGroupTestClassifications(repoRoot).tests, 'number');
});

test('rejects a missing authored test classification', async function rejectsMissing(t) {
	const root = await mkdtemp(join(tmpdir(), 'react-transition-group-classifications-'));
	t.after(async function cleanup() {
		await rm(root, { recursive: true, force: true });
	});
	for (const file of ['test-classifications.json', 'react-parity.json']) {
		await cp(
			new URL(`../../packages/react-transition-group/audit/${file}`, import.meta.url),
			join(root, `packages/react-transition-group/audit/${file}`),
			{ recursive: true },
		);
	}
	await cp(
		new URL('../../packages/react-transition-group/tests', import.meta.url),
		join(root, 'packages/react-transition-group/tests'),
		{ recursive: true },
	);
	await cp(
		new URL('../../packages/react-transition-group/typetests', import.meta.url),
		join(root, 'packages/react-transition-group/typetests'),
		{ recursive: true },
	);
	assert.deepEqual(verifyReactTransitionGroupTestClassifications(root), {
		tests: verifyReactTransitionGroupTestClassifications(repoRoot).tests,
	});
	await writeFile(
		join(root, 'packages/react-transition-group/tests/unclassified.test.ts'),
		'export {};\n',
	);
	assert.throws(function missingClassification() {
		verifyReactTransitionGroupTestClassifications(root);
	}, /every authored react-transition-group test must have exactly one classification/);
});
