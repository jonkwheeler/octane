#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	compareTestIdentities,
	summarizeRuntimeInventories,
	toPortablePath,
} from './harness-lib.mjs';
import {
	inventoryFromIdentities,
	runPristineUpstreamSuite,
} from './intersection-observer-pristine-runtime.mjs';
import { renderTypeInventories } from './intersection-observer-types-lib.mjs';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));

function writeInventory(destination, inventory) {
	const absolute = resolve(root, destination);
	mkdirSync(dirname(absolute), { recursive: true });
	writeFileSync(absolute, `${JSON.stringify(inventory, null, '\t')}\n`);
	const count = Array.isArray(inventory.tests)
		? `${inventory.tests.length} tests`
		: `${inventory.assertionGroups?.length ?? 0} assertion groups`;
	console.log(`${destination}: ${count}`);
}

const pristine = runPristineUpstreamSuite({ repoRoot: root });
if (pristine.status !== 0) {
	process.stderr.write(pristine.stdout);
	process.stderr.write(pristine.stderr);
	throw new Error(
		'Intersection-observer pristine upstream suite failed while generating inventory',
	);
}
writeInventory(
	'packages/intersection-observer/audit/pristine-runtime.json',
	inventoryFromIdentities(pristine.identities),
);

const listed = JSON.parse(
	execFileSync(
		process.execPath,
		[
			'node_modules/vitest/vitest.mjs',
			'list',
			'--project',
			'intersection-observer-adapted',
			'--json',
		],
		{ cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
	),
);
const idOccurrences = new Map();
const adaptedTests = listed
	.map(function mapListed(test) {
		return {
			...test,
			relativeFile: toPortablePath(relative(root, test.file)),
		};
	})
	.filter(function keepAdapted(test) {
		return test.relativeFile.startsWith('packages/intersection-observer/tests/upstream/');
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

writeInventory('packages/intersection-observer/audit/adapted-runtime.json', {
	schemaVersion: 1,
	project: 'intersection-observer-adapted',
	roots: ['packages/intersection-observer/tests/upstream'],
	files: [
		...new Set(
			adaptedTests.map(function fileOf(test) {
				return test.file;
			}),
		),
	].sort(),
	tests: adaptedTests,
	snapshots: 0,
});

const { inventory: typeInventory } = renderTypeInventories(root);
writeInventory('packages/intersection-observer/audit/pristine-types.json', typeInventory.upstream);
writeInventory('packages/intersection-observer/audit/adapted-types.json', typeInventory.adapted);

const adaptedRuntime = JSON.parse(
	readFileSync(resolve(root, 'packages/intersection-observer/audit/adapted-runtime.json'), 'utf8'),
);
console.log('adapted runtime summary', summarizeRuntimeInventories([adaptedRuntime]));
