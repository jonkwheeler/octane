#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compareTestIdentities, toPortablePath } from './harness-lib.mjs';
import { inventoryFromIdentities } from './pristine-suite-lib.mjs';
import { verifyMaterializedUpstreamEvidence } from './materialized-upstream-lib.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const packagePath = 'packages/floating-ui';
const packageRoot = resolve(repoRoot, packagePath);

const suites = {
	pristine: {
		config: 'tests/_support/upstream-vitest.config.ts',
		expectedPassed: 286,
		expectedSkipped: 6,
		project: 'floating-ui-pristine-child',
		root: `${packagePath}/upstream`,
	},
	adapted: {
		config: 'tests/_support/adapted-vitest.config.ts',
		expectedPassed: 286,
		expectedSkipped: 6,
		project: 'floating-ui-adapted-child',
		root: `${packagePath}/tests/upstream`,
	},
};

const inventoryPaths = {
	pristine: `${packagePath}/audit/pristine-runtime.json`,
	adapted: `${packagePath}/audit/adapted-runtime.json`,
	pristineWrapper: `${packagePath}/audit/pristine-wrapper-runtime.json`,
	adaptedWrapper: `${packagePath}/audit/adapted-wrapper-runtime.json`,
};

function readJson(path) {
	return JSON.parse(readFileSync(resolve(repoRoot, path), 'utf8'));
}

function identitiesFromReport(report) {
	const identities = [];
	for (const suite of report.testResults ?? []) {
		const file = toPortablePath(relative(repoRoot, resolve(suite.name)));
		for (const assertion of suite.assertionResults ?? []) {
			if (assertion.status === 'pending' || assertion.status === 'todo') continue;
			identities.push({
				file,
				fullName: assertion.fullName ?? assertion.title,
				status: assertion.status,
			});
		}
	}
	return identities.sort(compareTestIdentities);
}

function countsFromReport(report) {
	const statuses = (report.testResults ?? []).flatMap((suite) =>
		(suite.assertionResults ?? []).map((assertion) => assertion.status),
	);
	return {
		passed: statuses.filter((status) => status === 'passed').length,
		skipped: statuses.filter(
			(status) => status === 'skipped' || status === 'pending' || status === 'todo',
		).length,
	};
}

export function runFloatingUiUpstreamSuite(side) {
	const suite = suites[side];
	if (!suite) throw new Error(`unknown floating-ui upstream side: ${side}`);
	verifyMaterializedUpstreamEvidence(repoRoot, packagePath);
	const reportRoot = mkdtempSync(resolve(tmpdir(), `octane-floating-ui-${side}-`));
	const reportPath = resolve(reportRoot, 'report.json');
	try {
		const result = spawnSync(
			process.execPath,
			[
				resolve(packageRoot, 'node_modules/vitest-upstream/vitest.mjs'),
				'run',
				'--config',
				resolve(packageRoot, suite.config),
				'--reporter=json',
				`--outputFile=${reportPath}`,
				'--silent=true',
				'--cache=false',
			],
			{
				cwd: repoRoot,
				env: { ...process.env, CI: process.env.CI ?? 'true' },
				encoding: 'utf8',
			},
		);
		const report = JSON.parse(readFileSync(reportPath, 'utf8'));
		const counts = countsFromReport(report);
		if (
			result.status === 0 &&
			(counts.passed !== suite.expectedPassed || counts.skipped !== suite.expectedSkipped)
		) {
			throw new Error(
				`${side} Floating UI suite registered ${counts.passed} passed and ${counts.skipped} skipped assertions; expected ${suite.expectedPassed} passed and ${suite.expectedSkipped} skipped`,
			);
		}
		return {
			status: result.status ?? 1,
			stdout: result.stdout ?? '',
			stderr: result.stderr ?? '',
			identities: identitiesFromReport(report),
			counts,
		};
	} finally {
		rmSync(reportRoot, { recursive: true, force: true });
	}
}

export function floatingUiInventory(side, identities) {
	const suite = suites[side];
	if (!suite) throw new Error(`unknown floating-ui upstream side: ${side}`);
	return inventoryFromIdentities(identities, {
		project: suite.project,
		roots: [suite.root],
	});
}

function pairedKey(test, side) {
	const prefix =
		side === 'pristine' ? `${packagePath}/upstream/test/` : `${packagePath}/tests/upstream/`;
	if (!test.file.startsWith(prefix)) {
		throw new Error(`${side} runtime identity escaped its selected root: ${test.file}`);
	}
	return `${test.file.slice(prefix.length)}\0${test.fullName}`;
}

export function verifyFloatingUiRuntimeCrosswalk(pristine, adapted) {
	const pristineKeys = pristine.tests.map((test) => pairedKey(test, 'pristine')).sort();
	const adaptedKeys = adapted.tests.map((test) => pairedKey(test, 'adapted')).sort();
	if (JSON.stringify(pristineKeys) !== JSON.stringify(adaptedKeys)) {
		const adaptedSet = new Set(adaptedKeys);
		const pristineSet = new Set(pristineKeys);
		const missing = pristineKeys.filter((key) => !adaptedSet.has(key));
		const unexpected = adaptedKeys.filter((key) => !pristineSet.has(key));
		throw new Error(
			`floating-ui runtime crosswalk drifted\nmissing:\n${missing.join('\n')}\nunexpected:\n${unexpected.join('\n')}`,
		);
	}
	return pristineKeys.length;
}

function wrapperInventory(side) {
	const pristine = side === 'pristine';
	return inventoryFromIdentities(
		[
			{
				file: `${packagePath}/tests/parity/${side}-upstream.test.ts`,
				fullName: pristine
					? 'runs the pinned @floating-ui/react 0.27.19 suite unchanged'
					: 'runs every paired upstream assertion against Octane',
				status: 'passed',
			},
		],
		{
			project: pristine ? 'floating-ui-pristine' : 'floating-ui-upstream-adapted',
			roots: [`${packagePath}/tests/parity`],
		},
	);
}

function stableJson(value) {
	return `${JSON.stringify(value, null, 2)}\n`;
}

function writeOrCheck(path, value, write) {
	const next = stableJson(value);
	if (write) {
		writeFileSync(resolve(repoRoot, path), next);
		return;
	}
	if (readFileSync(resolve(repoRoot, path), 'utf8') !== next) {
		throw new Error(`${path} drifted; run this script with --write`);
	}
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const write = process.argv.includes('--write');
	const pristineResult = runFloatingUiUpstreamSuite('pristine');
	const adaptedResult = runFloatingUiUpstreamSuite('adapted');
	const output = [
		pristineResult.stdout,
		pristineResult.stderr,
		adaptedResult.stdout,
		adaptedResult.stderr,
	].join('\n');
	if (pristineResult.status !== 0 || adaptedResult.status !== 0) {
		process.stderr.write(output);
		process.exit(1);
	}
	const pristine = floatingUiInventory('pristine', pristineResult.identities);
	const adapted = floatingUiInventory('adapted', adaptedResult.identities);
	const paired = verifyFloatingUiRuntimeCrosswalk(pristine, adapted);
	writeOrCheck(inventoryPaths.pristine, pristine, write);
	writeOrCheck(inventoryPaths.adapted, adapted, write);
	writeOrCheck(inventoryPaths.pristineWrapper, wrapperInventory('pristine'), write);
	writeOrCheck(inventoryPaths.adaptedWrapper, wrapperInventory('adapted'), write);
	console.log(`Floating UI upstream runtime: ${paired} paired assertions passed on both lanes.`);
}
