import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import {
	FLOATING_UI_RUNTIME_PARITY_CONFIG,
	verifyFloatingUiRuntimeEvidence,
} from './floating-ui-evidence-lib.mjs';
import { verifyFloatingUiRuntimeCrosswalk } from './floating-ui-upstream-runtime.mjs';

const repoRoot = resolve(import.meta.dirname, '../..');

function readJson(path) {
	return JSON.parse(readFileSync(resolve(repoRoot, path), 'utf8'));
}

test('verifies every Floating UI runtime assertion has a paired Octane execution', () => {
	assert.deepEqual(verifyFloatingUiRuntimeEvidence(repoRoot), { paired: 286, wrappers: 2 });
});

test('rejects an omitted adapted Floating UI assertion', () => {
	const config = readJson(FLOATING_UI_RUNTIME_PARITY_CONFIG);
	const pristine = readJson(config.inventories.pristine);
	const adapted = structuredClone(readJson(config.inventories.adapted));
	adapted.tests.pop();
	assert.throws(
		() => verifyFloatingUiRuntimeCrosswalk(pristine, adapted),
		/runtime crosswalk drifted/,
	);
});

test('rejects a renamed adapted Floating UI assertion', () => {
	const config = readJson(FLOATING_UI_RUNTIME_PARITY_CONFIG);
	const pristine = readJson(config.inventories.pristine);
	const adapted = structuredClone(readJson(config.inventories.adapted));
	adapted.tests[0].fullName += ' renamed';
	assert.throws(
		() => verifyFloatingUiRuntimeCrosswalk(pristine, adapted),
		/runtime crosswalk drifted/,
	);
});
