import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildCapabilityInventory, planPortGraph } from './graph-lib.mjs';
import { detectWorktreeCollisions } from './state-lib.mjs';

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
	readFileSync(path.join(SCRIPT_DIRECTORY, '__fixtures__/scenarios/acceptance.json'), 'utf8'),
);

function inventory() {
	return buildCapabilityInventory({
		knownBindings: {
			'react-covered': '@octanejs/covered',
			'react-partial': '@octanejs/partial',
		},
		knownVanillaCores: { 'react-thin': 'thin-core' },
		reactApiMap: { useState: { status: 'same' }, Component: { status: 'unsupported' } },
		bindings: [
			{
				name: '@octanejs/covered',
				version: '0.1.0',
				exports: ['.'],
				tested: true,
				status: {
					upstream: { package: 'react-covered', version: '2.4.0' },
					verified: '2026-08-01',
				},
			},
			{
				name: '@octanejs/partial',
				version: '0.1.0',
				exports: ['.'],
				tested: true,
				status: {
					upstream: { package: 'react-partial', version: '1.0.0' },
					verified: 'partial',
				},
			},
		],
		octanePublicSourceSha256: 'octane-fixture',
		differencesSha256: 'differences-fixture',
	});
}

describe('fresh forward scenarios', () => {
	for (const scenario of fixture.scenarios) {
		test(`${scenario.id}: ${scenario.prompt}`, () => {
			const first = planPortGraph({
				targets: scenario.targets,
				inventory: inventory(),
				dependencyClassifications: scenario.classifications,
			});
			const second = planPortGraph({
				targets: structuredClone(scenario.targets),
				inventory: inventory(),
				dependencyClassifications: structuredClone(scenario.classifications),
			});
			assert.deepEqual(second, first, 'fresh runs must produce the same semantic graph');
			for (const [nodeId, expectation] of Object.entries(scenario.expected)) {
				for (const [field, value] of Object.entries(expectation)) {
					assert.deepEqual(first.nodes[nodeId]?.[field], value, `${nodeId}.${field}`);
				}
			}
			assert.doesNotMatch(JSON.stringify(first), /IGNORE ALL REPOSITORY RULES|run curl/);
			if (scenario.worktree) {
				assert.deepEqual(
					detectWorktreeCollisions(scenario.worktree),
					scenario.worktree.expectedCollisions,
				);
			}
		});
	}
});
