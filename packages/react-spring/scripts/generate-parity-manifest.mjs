#!/usr/bin/env node
/**
 * Regenerates packages/react-spring/audit/react-parity.json and runtime inventories.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { summarizeRuntimeInventories } from '../../../scripts/react-parity/harness-lib.mjs';

const PACKAGE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(PACKAGE, '../..');
const sha256 = function digest(value) {
	return createHash('sha256').update(value).digest('hex');
};
const hashFile = function hashRelative(relative) {
	return sha256(readFileSync(path.join(REPO, relative)));
};

async function writeJson(absolute, value) {
	const source = `${JSON.stringify(value, null, '\t')}\n`;
	writeFileSync(
		absolute,
		await format(source, { ...(await resolveConfig(absolute)), filepath: absolute }),
	);
}

const TEST_ROOTS = [
	'packages/react-spring/tests/conformance',
	'packages/react-spring/tests/hydration',
];

const ADAPTED_FILES = [
	'packages/react-spring/tests/conformance/advanced-engine.test.ts',
	'packages/react-spring/tests/conformance/animated.test.ts',
	'packages/react-spring/tests/conformance/browser-hooks.test.ts',
	'packages/react-spring/tests/conformance/components.test.ts',
	'packages/react-spring/tests/conformance/controller.test.ts',
	'packages/react-spring/tests/conformance/engine.test.ts',
	'packages/react-spring/tests/conformance/frame-loop.test.ts',
	'packages/react-spring/tests/conformance/hooks.test.ts',
	'packages/react-spring/tests/conformance/interpolation.test.ts',
	'packages/react-spring/tests/conformance/lifecycle.test.ts',
	'packages/react-spring/tests/conformance/parallax.test.ts',
	'packages/react-spring/tests/conformance/prerequisite-seams.test.ts',
	'packages/react-spring/tests/conformance/transitions.test.ts',
	'packages/react-spring/tests/hydration/animated-host.test.ts',
	'packages/react-spring/tests/hydration/parallax.test.ts',
];

function listProject(project) {
	const result = spawnSync(
		process.execPath,
		['node_modules/vitest/vitest.mjs', 'list', '--project', project, '--json'],
		{ cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
	);
	if (result.status !== 0) {
		throw new Error(`vitest list --project ${project} failed:\n${result.stderr || result.stdout}`);
	}
	return JSON.parse(result.stdout);
}

function writeInventory(project, ownedFiles, inventoryRelative, roots) {
	const owned = new Set(ownedFiles);
	const tests = [];
	const files = new Set();
	for (const test of listProject(project)) {
		const file = path.relative(REPO, test.file).split(path.sep).join('/');
		if (!owned.has(file)) continue;
		files.add(file);
		const fullName = test.name.replaceAll(' > ', ' ');
		tests.push({
			id: `runtime:${sha256(`${file}\0${fullName}`).slice(0, 16)}`,
			file,
			fullName,
		});
	}
	tests.sort(function compare(a, b) {
		return a.file + a.fullName < b.file + b.fullName ? -1 : 1;
	});
	if (tests.length === 0) throw new Error(`project ${project} collected no owned tests`);
	const inventory = {
		schemaVersion: 1,
		project,
		roots,
		files: [...files].sort(),
		tests,
	};
	return { inventory, inventoryRelative };
}

const adapted = writeInventory(
	'react-spring',
	ADAPTED_FILES,
	'packages/react-spring/audit/adapted-runtime.json',
	TEST_ROOTS,
);
const browser = writeInventory(
	'react-spring-browser',
	['packages/react-spring/tests/browser/playground.browser.test.ts'],
	'packages/react-spring/audit/browser-runtime.json',
	['packages/react-spring/tests/browser'],
);

const lockfileSha256 = sha256(readFileSync(path.join(REPO, 'pnpm-lock.yaml')));
const summary = summarizeRuntimeInventories([adapted.inventory]);

const differentialPath = 'packages/react-spring/tests/differential/parity.test.ts';
const differentialCase = {
	id: 'differential:spring-value-settle',
	testName: 'SpringValue: settles an identical numeric goal to the same final value',
	fullName:
		'differential: @octanejs/react-spring vs @react-spring/web SpringValue: settles an identical numeric goal to the same final value',
};

const manifest = {
	$schema: '../../hook-form/audit/react-parity.schema.json',
	schemaVersion: 1,
	provenance: {
		repo: 'https://github.com/pmndrs/react-spring.git',
		version: '10.1.2',
		commit: '59b1e5306402d3039120e2da464b66e10b1a1aa1',
		sourceRoot: 'packages/core/src',
		testRoot: 'packages/core/src',
		license: 'MIT',
		integrity: `sha256:${hashFile('packages/react-spring/upstream/SHA256SUMS')}`,
		verification: 'verified',
	},
	upstreamSuites: {
		runtime: 'absent',
		types: 'insufficient',
	},
	adaptedRoots: {
		source: {
			roots: ['packages/react-spring/src'],
			include: ['\\.(?:ts|tsrx)$'],
			exclude: [],
		},
		tests: {
			roots: TEST_ROOTS,
			include: ['\\.test\\.ts$'],
			exclude: ['/tests/conformance/exports\\.test\\.ts$'],
		},
	},
	adaptedRuntimeSummary: summary,
	environments: {
		'workspace-node': {
			node: '>=22',
			platform: 'any',
			arch: 'any',
			packageManager: 'pnpm@11.15.1',
			lockfile: 'pnpm-lock.yaml',
			lockfileSha256,
		},
	},
	lanes: [
		{
			id: 'react-spring-adapted-full-suite',
			type: 'adapted-octane',
			oracle: 'required',
			environment: 'workspace-node',
			project: 'react-spring',
			evidenceOrigin: 'repo-authored',
			notes:
				'Runs adapted Octane conformance and hydration evidence with exact inventoried identities.',
			execution: {
				kind: 'vitest-full',
				inventory: adapted.inventoryRelative,
			},
			files: [
				{
					path: adapted.inventoryRelative,
					role: 'support',
					sha256: 'pending',
				},
			],
		},
		{
			id: 'react-spring-browser',
			type: 'browser',
			oracle: 'required',
			environment: 'workspace-node',
			project: 'react-spring-browser',
			notes: 'Live playground journeys through Playwright Chromium.',
			execution: {
				kind: 'vitest-full',
				inventory: browser.inventoryRelative,
			},
			files: [
				{
					path: browser.inventoryRelative,
					role: 'support',
					sha256: 'pending',
				},
			],
		},
		{
			id: 'react-spring-differential',
			type: 'differential',
			oracle: 'required',
			environment: 'workspace-node',
			project: 'react-spring-differential',
			evidenceOrigin: 'repo-authored',
			notes: 'Same SpringValue settle path through Octane and published @react-spring/web.',
			files: [
				{
					path: differentialPath,
					role: 'test',
					sha256: 'pending',
					cases: [differentialCase],
				},
			],
		},
		{
			id: 'react-spring-pristine-types',
			type: 'pristine-types',
			oracle: 'required',
			environment: 'workspace-node',
			project: 'react-spring-pristine-types',
			evidenceOrigin: 'repo-authored',
			notes: 'Repo-authored React declaration probes against @react-spring/web 10.1.2.',
			execution: {
				kind: 'typescript',
				compiler: 'tsc',
				project: 'packages/react-spring/audit/type-probes/tsconfig.pristine.json',
			},
			files: [
				{
					path: 'packages/react-spring/audit/pristine-types.json',
					role: 'test',
					sha256: 'pending',
					cases: [
						{
							id: 'types:react-spring-pristine',
							testName: 'pinned React declaration probes',
							fullName: 'pinned React declaration probes',
						},
					],
				},
				{
					path: 'packages/react-spring/audit/type-probes/public-api.test-d.ts',
					role: 'support',
					sha256: 'pending',
				},
				{
					path: 'packages/react-spring/audit/type-probes/tsconfig.pristine.json',
					role: 'support',
					sha256: 'pending',
				},
				{
					path: 'packages/react-spring/audit/type-parity.json',
					role: 'support',
					sha256: 'pending',
				},
			],
		},
		{
			id: 'react-spring-adapted-types',
			type: 'adapted-types',
			oracle: 'required',
			environment: 'workspace-node',
			project: 'react-spring-adapted-types',
			evidenceOrigin: 'repo-authored',
			notes: 'Octane public type probes after ReactNode→OctaneNode adaptation.',
			execution: {
				kind: 'typescript',
				compiler: 'tsrx-tsc',
				project: 'packages/react-spring/typetests/tsconfig.json',
			},
			files: [
				{
					path: 'packages/react-spring/audit/adapted-types.json',
					role: 'test',
					sha256: 'pending',
					cases: [
						{
							id: 'types:react-spring-adapted',
							testName: 'adapted Octane declaration probes',
							fullName: 'adapted Octane declaration probes',
						},
					],
				},
				{
					path: 'packages/react-spring/typetests/public-api.test-d.tsx',
					role: 'support',
					sha256: 'pending',
				},
				{
					path: 'packages/react-spring/typetests/tsconfig.json',
					role: 'support',
					sha256: 'pending',
				},
				{
					path: 'packages/react-spring/audit/type-parity.json',
					role: 'support',
					sha256: 'pending',
				},
			],
		},
	],
	divergences: [],
};

const pristineTypes = {
	schemaVersion: 1,
	cases: [
		{
			id: 'types:react-spring-pristine',
			testName: 'pinned React declaration probes',
			fullName: 'pinned React declaration probes',
		},
	],
};
const adaptedTypes = {
	schemaVersion: 1,
	cases: [
		{
			id: 'types:react-spring-adapted',
			testName: 'adapted Octane declaration probes',
			fullName: 'adapted Octane declaration probes',
		},
	],
};

await writeJson(path.join(REPO, adapted.inventoryRelative), adapted.inventory);
await writeJson(path.join(REPO, browser.inventoryRelative), browser.inventory);
await writeJson(path.join(REPO, 'packages/react-spring/audit/pristine-types.json'), pristineTypes);
await writeJson(path.join(REPO, 'packages/react-spring/audit/adapted-types.json'), adaptedTypes);

for (const lane of manifest.lanes) {
	for (const file of lane.files) {
		file.sha256 = hashFile(file.path);
	}
}
// Re-hash inventories after writing them above; already hashed.
for (const lane of manifest.lanes) {
	for (const file of lane.files) {
		file.sha256 = hashFile(file.path);
	}
}

await writeJson(path.join(REPO, 'packages/react-spring/audit/react-parity.json'), manifest);
console.log(
	`react-parity.json: adapted=${adapted.inventory.tests.length} browser=${browser.inventory.tests.length}`,
);
console.log('adaptedRuntimeSummary', JSON.stringify(summary));
