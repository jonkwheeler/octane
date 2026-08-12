import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildCapabilityInventory, planPortGraph } from './graph-lib.mjs';
import { detectWorktreeCollisions } from './state-lib.mjs';

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
	readFileSync(path.join(SCRIPT_DIRECTORY, '__fixtures__/scenarios/acceptance.json'), 'utf8'),
);
const PREFLIGHT_CLI = path.join(SCRIPT_DIRECTORY, 'preflight.mjs');
const EVIDENCE_CLI = path.join(SCRIPT_DIRECTORY, 'evidence.mjs');
const TERMINAL_CLI = path.join(SCRIPT_DIRECTORY, 'terminal.mjs');
const MIT_FIXTURE = path.join(SCRIPT_DIRECTORY, '__fixtures__/resolved/mit-widget.json');
const mitFixture = JSON.parse(readFileSync(MIT_FIXTURE, 'utf8'));

function runNodeCli(script, arguments_, cwd) {
	return spawnSync(process.execPath, [script, ...arguments_], { cwd, encoding: 'utf8' });
}

function writeJson(filePath, value) {
	writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function createBindingPackage(workspace, licenseText) {
	const packageDirectory = path.join(workspace, 'packages/fixture-widget');
	mkdirSync(path.join(packageDirectory, 'src'), { recursive: true });
	mkdirSync(path.join(packageDirectory, 'tests'));
	writeJson(path.join(packageDirectory, 'package.json'), {
		name: '@octanejs/fixture-widget',
		version: '0.1.0',
		license: 'MIT',
		engines: { node: '>=22' },
		publishConfig: { access: 'public' },
		repository: { directory: 'packages/fixture-widget' },
		files: ['src', 'README.md', 'UPSTREAM.md', 'LICENSE'],
		exports: { '.': './src/index.mjs' },
		scripts: { test: 'node --test tests/*.test.mjs' },
		peerDependencies: { octane: 'workspace:*' },
		devDependencies: { octane: 'workspace:*' },
	});
	writeFileSync(
		path.join(packageDirectory, 'src/index.mjs'),
		'export function fixtureWidget(value) { return `fixture:${value}`; }\n',
	);
	writeFileSync(
		path.join(packageDirectory, 'tests/fixture-widget.test.mjs'),
		"import assert from 'node:assert/strict';\nimport { test } from 'node:test';\nimport { fixtureWidget } from '../src/index.mjs';\ntest('exposes the pinned widget behavior', () => assert.equal(fixtureWidget('ok'), 'fixture:ok'));\n",
	);
	writeFileSync(path.join(packageDirectory, 'README.md'), '# Fixture Widget\n');
	writeFileSync(path.join(packageDirectory, 'LICENSE'), licenseText);
	writeFileSync(
		path.join(packageDirectory, 'UPSTREAM.md'),
		`# Upstream\n\nfixture-widget@1.0.0\n\ncommit ${'a'.repeat(40)}\n\n## Source boundary\n\nIndependently authored fixture behavior.\n`,
	);
	writeJson(path.join(packageDirectory, 'status.json'), {
		upstream: { package: 'fixture-widget', version: '1.0.0' },
		surface: 'Complete fixture public surface.',
		verified: '2026-08-12',
	});
	return packageDirectory;
}

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

	test('completes an offline binding lifecycle through public CLI artifacts', (context) => {
		const workspace = mkdtempSync(path.join(tmpdir(), 'react-port-forward-lifecycle-'));
		context.after(() => rmSync(workspace, { recursive: true, force: true }));
		const initializedRepository = spawnSync('git', ['init', '--quiet'], {
			cwd: workspace,
			encoding: 'utf8',
		});
		assert.equal(initializedRepository.status, 0, initializedRepository.stderr);

		const workRoot = path.join(workspace, '.react-port-work');
		const batch = 'offline-lifecycle';
		const common = ['--work-root', workRoot, '--batch', batch];
		const preflight = runNodeCli(
			PREFLIGHT_CLI,
			[
				...common,
				'--fixture-evidence',
				MIT_FIXTURE,
				'--classify',
				'fixture-core=framework-neutral',
				'fixture-widget@1.0.0',
			],
			workspace,
		);
		assert.equal(preflight.status, 0, preflight.stderr);
		const preflightReport = JSON.parse(preflight.stdout);
		assert.deepEqual(preflightReport.graph.actionableExecutionUnits, [['pkg:fixture-widget']]);

		const initialTerminal = runNodeCli(TERMINAL_CLI, common, workspace);
		assert.equal(initialTerminal.status, 2);
		const implementReport = JSON.parse(initialTerminal.stdout);
		assert.equal(implementReport.status, 'unfinished');
		assert.deepEqual(
			{
				kind: implementReport.nextActions[0].kind,
				action: implementReport.nextActions[0].action,
				binding: implementReport.nextActions[0].binding,
				bindingDirectory: implementReport.nextActions[0].bindingDirectory,
				version: implementReport.nextActions[0].identity.version,
				dependencyAction: implementReport.nextActions[0].dependencies[0].action,
			},
			{
				kind: 'implement',
				action: 'create-binding',
				binding: '@octanejs/fixture-widget',
				bindingDirectory: 'packages/fixture-widget',
				version: '1.0.0',
				dependencyAction: 'reuse-package',
			},
		);

		const evidenceCommon = [...common, '--node', 'pkg:fixture-widget'];
		const evidenceInit = runNodeCli(
			EVIDENCE_CLI,
			['init', ...evidenceCommon, '--category', 'thin-core'],
			workspace,
		);
		assert.equal(evidenceInit.status, 0, evidenceInit.stderr);
		const manifestPath = path.join(workRoot, batch, 'manifest.json');
		let manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
		assert.deepEqual(
			manifest.history.map(({ from, to }) => ({ from, to })),
			[{ from: 'ready', to: 'implementing' }],
		);

		const licenseText = mitFixture.targets['fixture-widget@1.0.0'].registry.licenseFiles[0].content;
		const packageDirectory = createBindingPackage(workspace, licenseText);
		const evidenceDirectory = path.join(workspace, 'evidence');
		mkdirSync(evidenceDirectory);
		const registrationsPath = path.join(evidenceDirectory, 'registrations.json');
		const crosswalkPath = path.join(evidenceDirectory, 'crosswalk.json');
		const closurePath = path.join(evidenceDirectory, 'closure.json');
		writeJson(registrationsPath, [{ id: 'fixture-widget-export', source: 'fixture-contract' }]);
		writeJson(crosswalkPath, [
			{
				id: 'fixture-widget-export',
				classification: 'implemented',
				localEvidence: 'packages/fixture-widget/tests/fixture-widget.test.mjs',
			},
		]);
		writeJson(closurePath, {
			runtimeDependencies: ['octane', 'fixture-core'],
			adaptedSources: [],
			reimplementedDependencies: [],
		});
		const packageTests = runNodeCli(
			EVIDENCE_CLI,
			[
				'run',
				...evidenceCommon,
				'--gate',
				'package-tests',
				'--',
				process.execPath,
				'-e',
				`import(${JSON.stringify(pathToFileURL(path.join(packageDirectory, 'src/index.mjs')).href)}).then(({ fixtureWidget }) => { if (fixtureWidget('ok') !== 'fixture:ok') process.exit(1); process.stdout.write('fixture behavior passed'); })`,
			],
			workspace,
		);
		assert.equal(packageTests.status, 0, packageTests.stderr || packageTests.stdout);
		assert.match(JSON.parse(packageTests.stdout).gate.observed, /fixture behavior passed/i);
		manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

		const machineGates = new Set([
			'identity-license',
			'upstream-crosswalk',
			'package-contract',
			'provenance',
			'closure-audit',
		]);
		for (const gate of Object.values(manifest.nodes['pkg:fixture-widget'].evidenceMatrix.gates)) {
			if (gate.status !== 'required' || machineGates.has(gate.id)) continue;
			const recorded = runNodeCli(
				EVIDENCE_CLI,
				[
					'record',
					...evidenceCommon,
					'--gate',
					gate.id,
					'--status',
					'passed',
					'--artifact',
					path.join(packageDirectory, 'tests/fixture-widget.test.mjs'),
					'--observed',
					'Offline lifecycle fixture supplied observable evidence.',
				],
				workspace,
			);
			assert.equal(recorded.status, 0, `${gate.id}: ${recorded.stderr}`);
		}

		const verified = runNodeCli(
			EVIDENCE_CLI,
			[
				'verify',
				...evidenceCommon,
				'--package-dir',
				packageDirectory,
				'--expected-directory',
				'packages/fixture-widget',
				'--registrations',
				registrationsPath,
				'--crosswalk',
				crosswalkPath,
				'--closure',
				closurePath,
			],
			workspace,
		);
		assert.equal(verified.status, 0, verified.stderr || verified.stdout);
		const verificationReport = JSON.parse(verified.stdout);
		assert.equal(verificationReport.status, 'passed');
		assert.equal(verificationReport.state, 'verified');
		assert.deepEqual(Object.keys(verificationReport.packageReport.artifacts), [
			'LICENSE',
			'README.md',
			'UPSTREAM.md',
			'package.json',
			'status.json',
		]);

		const terminal = runNodeCli(TERMINAL_CLI, common, workspace);
		assert.equal(terminal.status, 0, terminal.stderr);
		const terminalReport = JSON.parse(terminal.stdout);
		assert.equal(terminalReport.status, 'terminal');
		assert.deepEqual(terminalReport.requested, [
			{ id: 'pkg:fixture-widget', state: 'verified', disposition: 'verified' },
		]);
		for (const relativePath of [
			'package.json',
			'src/index.mjs',
			'tests/fixture-widget.test.mjs',
			'UPSTREAM.md',
			'LICENSE',
			'status.json',
		]) {
			assert.ok(existsSync(path.join(packageDirectory, relativePath)), relativePath);
		}
		manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
		assert.deepEqual(
			manifest.history.map(({ from, to }) => ({ from, to })),
			[
				{ from: 'ready', to: 'implementing' },
				{ from: 'implementing', to: 'verified' },
			],
		);
		assert.ok(
			manifestPath.startsWith(workspace),
			'lifecycle state must stay in the temp workspace',
		);
	});
});
