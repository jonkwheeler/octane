import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { verifyFloatingUiRuntimeCrosswalk } from './floating-ui-upstream-runtime.mjs';
import { verifyMaterializedUpstreamEvidence } from './materialized-upstream-lib.mjs';

export const FLOATING_UI_RUNTIME_PARITY_CONFIG = 'packages/floating-ui/audit/runtime-parity.json';

function readJson(repoRoot, relativePath) {
	return JSON.parse(readFileSync(resolve(repoRoot, relativePath), 'utf8'));
}

export function verifyFloatingUiRuntimeEvidence(repoRoot) {
	verifyMaterializedUpstreamEvidence(repoRoot, 'packages/floating-ui');
	const config = readJson(repoRoot, FLOATING_UI_RUNTIME_PARITY_CONFIG);
	if (
		!Array.isArray(config.permittedTransformations) ||
		config.permittedTransformations.length === 0
	) {
		throw new Error('floating-ui runtime parity must declare its permitted transformations');
	}
	const pristine = readJson(repoRoot, config.inventories.pristine);
	const adapted = readJson(repoRoot, config.inventories.adapted);
	const pristineWrapper = readJson(repoRoot, config.inventories.pristineWrapper);
	const adaptedWrapper = readJson(repoRoot, config.inventories.adaptedWrapper);
	const expected = config.expectedRegistrations;
	if (pristine.tests.length !== expected.pristinePassed) {
		throw new Error(
			`floating-ui pristine inventory must contain ${expected.pristinePassed} passed assertions`,
		);
	}
	if (adapted.tests.length !== expected.adaptedPassed) {
		throw new Error(
			`floating-ui adapted inventory must contain ${expected.adaptedPassed} passed assertions`,
		);
	}
	const paired = verifyFloatingUiRuntimeCrosswalk(pristine, adapted);
	if (expected.omitted !== 0 || paired !== expected.pristinePassed) {
		throw new Error('floating-ui runtime crosswalk must retain every upstream assertion');
	}
	for (const [side, inventory] of [
		['pristine', pristineWrapper],
		['adapted', adaptedWrapper],
	]) {
		if (inventory.tests.length !== 1) {
			throw new Error(`floating-ui ${side} wrapper inventory must contain exactly one runner test`);
		}
	}
	return { paired, wrappers: 2 };
}
