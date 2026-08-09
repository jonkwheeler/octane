#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import {
	compareTestIdentities,
	summarizeRuntimeInventories,
	toPortablePath,
} from './harness-lib.mjs';
import { pristineTestIdentities } from './waypoint-pristine-runtime.mjs';
import { verifyWaypointUpstream } from '../../packages/waypoint/scripts/verify-upstream.mjs';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const jestBin = createRequire(resolve(root, 'packages/waypoint/package.json')).resolve(
	'jest/bin/jest',
);

function writeInventory(destination, inventory) {
	const absolute = resolve(root, destination);
	mkdirSync(dirname(absolute), { recursive: true });
	writeFileSync(absolute, `${JSON.stringify(inventory, null, '\t')}\n`);
	const count = Array.isArray(inventory.tests)
		? `${inventory.tests.length} tests`
		: `${inventory.length ?? 0} entries`;
	console.log(`${destination}: ${count}`);
}

verifyWaypointUpstream(resolve(root, 'packages/waypoint'));
const report = join(tmpdir(), `octane-waypoint-pristine-inventory-${process.pid}.json`);
const pristineResult = spawnSync(
	process.execPath,
	[
		jestBin,
		'--config',
		resolve(root, 'packages/waypoint/tests/upstream-jest.config.cjs'),
		'--rootDir',
		resolve(root, 'packages/waypoint/upstream'),
		'--runInBand',
		'--no-watchman',
		'--json',
		`--outputFile=${report}`,
	],
	{ cwd: root, encoding: 'utf8' },
);
try {
	if (pristineResult.status !== 0) {
		throw new Error(`${pristineResult.stdout}\n${pristineResult.stderr}`);
	}
	const reportJson = JSON.parse(readFileSync(report, 'utf8'));
	const tests = pristineTestIdentities(reportJson);
	writeInventory('packages/waypoint/audit/pristine-runtime.json', {
		schemaVersion: 1,
		root: 'packages/waypoint/upstream',
		tests,
		snapshots: reportJson.snapshot?.total ?? 0,
	});
} finally {
	rmSync(report, { force: true });
}

const adaptedFiles = [
	'packages/waypoint/tests/upstream/onNextTick.test.ts',
	'packages/waypoint/tests/upstream/resolveScrollableAncestorProp.test.ts',
	'packages/waypoint/tests/upstream/waypoint.test.ts',
];
const idOccurrences = new Map();
const listed = JSON.parse(
	execFileSync(
		process.execPath,
		['node_modules/vitest/vitest.mjs', 'list', '--project', 'waypoint-adapted', '--json'],
		{ cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
	),
);
const adaptedTests = listed
	.map(function mapListed(test) {
		return {
			...test,
			relativeFile: toPortablePath(relative(root, test.file)),
		};
	})
	.filter(function keepAdapted(test) {
		return adaptedFiles.includes(test.relativeFile);
	})
	.map(function toInventoryEntry(test) {
		const fullName = test.name.replaceAll(' > ', ' ');
		const baseId = `runtime:${createHash('sha256')
			.update(`${test.relativeFile}\0${fullName}`)
			.digest('hex')
			.slice(0, 16)}`;
		const occurrence = idOccurrences.get(baseId) ?? 0;
		idOccurrences.set(baseId, occurrence + 1);
		return {
			id: occurrence === 0 ? baseId : `${baseId}:${occurrence + 1}`,
			file: test.relativeFile,
			fullName,
		};
	})
	.sort(compareTestIdentities);

const adaptedInventory = {
	schemaVersion: 1,
	project: 'waypoint-adapted',
	roots: ['packages/waypoint/tests/upstream'],
	files: [
		...new Set(
			adaptedTests.map(function fileOf(test) {
				return test.file;
			}),
		),
	].sort(),
	tests: adaptedTests,
};
writeInventory('packages/waypoint/audit/adapted-runtime.json', adaptedInventory);

console.log(
	'adaptedRuntimeSummary',
	JSON.stringify(summarizeRuntimeInventories([adaptedInventory]), null, 2),
);
