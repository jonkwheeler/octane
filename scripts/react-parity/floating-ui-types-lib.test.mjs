import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { compareFloatingUiTypeSources, verifyFloatingUiTypes } from './floating-ui-types-lib.mjs';

const repoRoot = resolve(import.meta.dirname, '../..');
const pristine = readFileSync(
	resolve(repoRoot, 'packages/floating-ui/upstream/test/index.test-d.tsx'),
	'utf8',
);
const adapted = readFileSync(
	resolve(repoRoot, 'packages/floating-ui/tests/upstream/index.test-d.tsx'),
	'utf8',
);

test('verifies the paired Floating UI upstream type program', () => {
	assert.deepEqual(verifyFloatingUiTypes(repoRoot), { files: 2, assertions: 11 });
});

test('rejects a deleted type-program marker', () => {
	assert.throws(
		() => compareFloatingUiTypeSources(pristine, adapted.replace('\nRoot;\n', '\n')),
		/assertion groups differ/,
	);
});

test('rejects an unpermitted type-program change', () => {
	assert.throws(
		() => compareFloatingUiTypeSources(pristine, adapted.replace('useClick(context);', '')),
		/outside the permitted transformations/,
	);
});
