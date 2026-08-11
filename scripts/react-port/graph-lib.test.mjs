import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
	buildCapabilityInventory,
	planPortGraph,
	readRepositoryCapabilityInventory,
	satisfiesRange,
} from './graph-lib.mjs';
import { selectHighestSatisfyingVersion } from './version-lib.mjs';

function licensedTarget(packageName, version, runtimeDependencies = {}) {
	return {
		input: `${packageName}@${version}`,
		status: 'licensed',
		identity: { packageName, version, commit: 'a'.repeat(40), integrity: 'sha512-fixture' },
		evidenceFingerprint: `${packageName}-${version}`,
		runtimeDependencies,
	};
}

function fixtureInventory() {
	return buildCapabilityInventory({
		knownBindings: { 'react-covered': '@octanejs/covered', 'react-partial': '@octanejs/partial' },
		knownVanillaCores: { 'react-thin': 'thin-core' },
		reactApiMap: { useState: { status: 'same' }, Component: { status: 'unsupported' } },
		bindings: [
			{
				name: '@octanejs/covered',
				version: '0.1.0',
				exports: ['.', './server'],
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
		octanePublicSourceSha256: 'octane',
		differencesSha256: 'differences',
	});
}

describe('repository capability inventory', () => {
	test('reads live bindings, vanilla cores, React API facts, and stable fingerprints', () => {
		const inventory = readRepositoryCapabilityInventory();
		assert.equal(inventory.schemaVersion, 1);
		assert.equal(inventory.sourceBindings.zustand, '@octanejs/zustand');
		assert.equal(inventory.vanillaCores.zustand, 'zustand/vanilla');
		assert.equal(inventory.reactApis.useState.status, 'same');
		assert.equal(inventory.bindings['@octanejs/zustand'].status.upstream.package, 'zustand');
		assert.equal(inventory.bindings['@octanejs/zustand'].tested, true);
		assert.equal(inventory.fingerprint.length, 64);
	});

	test('checks exact versions and conservative semver lanes', () => {
		assert.equal(satisfiesRange('2.4.0', '^2.0.0'), true);
		assert.equal(satisfiesRange('2.4.0', '^3.0.0'), false);
		assert.equal(satisfiesRange('0.4.3', '^0.4.0'), true);
		assert.equal(satisfiesRange('0.5.0', '^0.4.0'), false);
		assert.equal(satisfiesRange('0.9.0', '^0'), true);
		assert.equal(satisfiesRange('0.2.0', '^0.1'), false);
		assert.equal(satisfiesRange('2.4.0', '2'), true);
		assert.equal(satisfiesRange('2.4.0', '2.4'), true);
		assert.equal(satisfiesRange('2.4.0', '>=2.0.0 <3.0.0'), true);
		assert.equal(satisfiesRange('2.4.0', '^1.0.0 || >=2.0.0 <3.0.0'), true);
		assert.equal(satisfiesRange('1.0.0', '>1.0.0 >=1.0.0'), false);
		assert.equal(satisfiesRange('2.0.0', '<2.0.0 <=2.0.0'), false);
		assert.equal(satisfiesRange('2.4.0', 'workspace:*'), false);
		assert.equal(
			selectHighestSatisfyingVersion(['1.0.0', '1.9.0', '2.0.0', '1.10.0-beta.1'], '^1.0.0'),
			'1.9.0',
		);
		assert.equal(
			selectHighestSatisfyingVersion(
				['1.0.0', '1.9.0', '2.0.0', '2.4.0', '3.0.0'],
				'^1.0.0 || >=2.0.0 <3.0.0',
			),
			'2.4.0',
		);
	});
});

describe('union prerequisite graph', () => {
	test('reuses adequate live bindings and framework-neutral cores', () => {
		const graph = planPortGraph({
			targets: [
				licensedTarget('react-thin', '1.0.0', {
					'react-covered': '^2.0.0',
					'thin-core': '^1.0.0',
				}),
			],
			inventory: fixtureInventory(),
			dependencyClassifications: { 'thin-core': 'framework-neutral' },
		});

		assert.equal(graph.nodes['pkg:react-covered'].action, 'reuse-binding');
		assert.equal(graph.nodes['pkg:react-covered'].state, 'verified');
		assert.equal(graph.nodes['pkg:thin-core'].action, 'reuse-package');
		assert.equal(graph.nodes['pkg:react-thin'].vanillaCore, 'thin-core');
		assert.deepEqual(graph.executionOrder.slice(0, 2), ['pkg:react-covered', 'pkg:thin-core']);
	});

	test('treats an incomplete existing binding as an extension prerequisite, never a duplicate', () => {
		const graph = planPortGraph({
			targets: [licensedTarget('consumer', '1.0.0', { 'react-partial': '^1.0.0' })],
			inventory: fixtureInventory(),
		});

		assert.equal(graph.nodes['pkg:react-partial'].binding, '@octanejs/partial');
		assert.equal(graph.nodes['pkg:react-partial'].action, 'extend-binding');
		assert.equal(graph.nodes['pkg:react-partial'].state, 'blocked');
		assert.match(graph.nodes['pkg:react-partial'].repair, /extend @octanejs\/partial/);
		assert.equal(graph.nodes['pkg:consumer'].state, 'blocked');
	});

	test('does not reuse an existing binding without executable test evidence', () => {
		const inventory = fixtureInventory();
		inventory.bindings['@octanejs/covered'].tested = false;
		const graph = planPortGraph({
			targets: [licensedTarget('consumer', '1.0.0', { 'react-covered': '^2.0.0' })],
			inventory,
		});

		assert.equal(graph.nodes['pkg:react-covered'].action, 'extend-binding');
		assert.equal(graph.nodes['pkg:react-covered'].state, 'blocked');
		assert.match(graph.nodes['pkg:react-covered'].blockers.join('\n'), /test evidence/i);
	});

	test('extends an existing binding when shipped code needs an unexported subpath', () => {
		const target = licensedTarget('consumer', '1.0.0', { 'react-covered': '^2.0.0' });
		target.sourceAnalysis = {
			verdict: 'bridgeable',
			filesScanned: 1,
			truncated: false,
			hazards: [],
			apis: [],
			imports: ['react-covered/advanced'],
		};
		const graph = planPortGraph({ targets: [target], inventory: fixtureInventory() });

		assert.deepEqual(graph.nodes['pkg:react-covered'].requiredSubpaths, ['./advanced']);
		assert.equal(graph.nodes['pkg:react-covered'].action, 'extend-binding');
		assert.equal(graph.nodes['pkg:react-covered'].state, 'blocked');
		assert.match(graph.nodes['pkg:react-covered'].blockers.join('\n'), /required subpath/i);
	});

	test('deduplicates a shared prerequisite and isolates an unrelated blocked branch', () => {
		const sharedPrerequisite = licensedTarget('react-helper', '1.2.0');
		sharedPrerequisite.requested = false;
		const graph = planPortGraph({
			targets: [
				licensedTarget('target-a', '1.0.0', { 'react-helper': '^1.0.0' }),
				licensedTarget('target-b', '1.0.0', { 'react-helper': '^1.0.0' }),
				sharedPrerequisite,
				{ input: 'blocked-target', status: 'blocked', blockers: ['not MIT'] },
				licensedTarget('independent', '1.0.0'),
			],
			inventory: fixtureInventory(),
			dependencyClassifications: { 'react-helper': 'react-coupled' },
		});

		assert.equal(Object.keys(graph.nodes).filter((id) => id === 'pkg:react-helper').length, 1);
		assert.equal(graph.nodes['pkg:react-helper'].requested, false);
		assert.deepEqual(graph.nodes['pkg:target-a'].dependsOn, ['pkg:react-helper']);
		assert.equal(graph.nodes['pkg:blocked-target'].state, 'blocked');
		assert.equal(graph.nodes['pkg:independent'].state, 'ready');
	});

	test('blocks incompatible version paths and names both dependents', () => {
		const graph = planPortGraph({
			targets: [
				licensedTarget('target-a', '1.0.0', { 'react-helper': '^1.0.0' }),
				licensedTarget('target-b', '1.0.0', { 'react-helper': '^2.0.0' }),
			],
			inventory: fixtureInventory(),
			dependencyClassifications: { 'react-helper': 'react-coupled' },
		});

		assert.equal(graph.nodes['pkg:react-helper'].state, 'blocked');
		assert.match(
			graph.nodes['pkg:react-helper'].blockers.join('\n'),
			/target-a.*target-b|target-b.*target-a/,
		);
		assert.equal(graph.nodes['pkg:target-a'].state, 'blocked');
		assert.equal(graph.nodes['pkg:target-b'].state, 'blocked');
	});

	test('collapses dependency cycles into one deterministic implementation unit', () => {
		const graph = planPortGraph({
			targets: [
				licensedTarget('cycle-a', '1.0.0', { 'cycle-b': '^1.0.0' }),
				licensedTarget('cycle-b', '1.0.0', { 'cycle-a': '^1.0.0' }),
			],
			inventory: fixtureInventory(),
			dependencyClassifications: { 'cycle-a': 'react-coupled', 'cycle-b': 'react-coupled' },
		});

		assert.deepEqual(graph.executionUnits, [['pkg:cycle-a', 'pkg:cycle-b']]);
		assert.equal(graph.nodes['pkg:cycle-a'].state, 'ready');
		assert.equal(graph.nodes['pkg:cycle-b'].state, 'ready');
	});

	test('turns unsupported shipped React surfaces into feasibility blockers', () => {
		const target = licensedTarget('custom-renderer', '1.0.0');
		target.sourceAnalysis = {
			verdict: 'needs-rework',
			truncated: false,
			hazards: ['Uses react-reconciler or a custom renderer boundary.'],
			apis: [],
		};
		const graph = planPortGraph({ targets: [target], inventory: fixtureInventory() });

		assert.equal(graph.nodes['pkg:custom-renderer'].state, 'blocked');
		assert.equal(graph.nodes['pkg:custom-renderer'].action, 'feasibility-blocker');
		assert.match(graph.nodes['pkg:custom-renderer'].blockers.join('\n'), /custom renderer/i);
	});
});
