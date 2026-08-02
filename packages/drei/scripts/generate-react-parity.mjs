#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const packageRoot = resolve(root, 'packages/drei');
const auditRoot = resolve(packageRoot, 'audit');
const portable = (value) => value.replaceAll('\\', '/');
const digest = (value) => createHash('sha256').update(value).digest('hex');

const listed = JSON.parse(
	execFileSync(
		process.execPath,
		['node_modules/vitest/vitest.mjs', 'list', '--project', 'drei', '--json'],
		{
			cwd: root,
			encoding: 'utf8',
			maxBuffer: 16 * 1024 * 1024,
		},
	),
);
const occurrences = new Map();
const tests = listed
	.map((test) => ({
		file: portable(relative(root, test.file)),
		fullName: test.name.replaceAll(' > ', ' '),
	}))
	.filter((test) => test.file.startsWith('packages/drei/tests/'))
	.map((test) => {
		const base = `runtime:${digest(`${test.file}\0${test.fullName}`).slice(0, 16)}`;
		const occurrence = occurrences.get(base) ?? 0;
		occurrences.set(base, occurrence + 1);
		return { id: occurrence === 0 ? base : `${base}:${occurrence + 1}`, ...test };
	})
	.sort((left, right) => {
		const leftKey = `${left.file}\0${left.fullName}`;
		const rightKey = `${right.file}\0${right.fullName}`;
		return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
	});
const inventory = {
	schemaVersion: 1,
	project: 'drei',
	roots: ['packages/drei/tests'],
	files: [...new Set(tests.map((test) => test.file))],
	tests,
};

const classifications = {
	schemaVersion: 1,
	tests: inventory.files.map((path) => {
		const source = readFileSync(resolve(root, path), 'utf8');
		if (path.endsWith('/crosswalk-guard.test.ts') || path.endsWith('/react-parity-guard.test.ts')) {
			return {
				path,
				disposition: 'octane-only-framework-contract',
				reason: 'Validates repository audit machinery; it is not React behavioral evidence.',
			};
		}
		if (path.endsWith('/config.test.ts')) {
			return {
				path,
				disposition: 'octane-only-framework-contract',
				reason: 'Validates the Octane renderer-boundary preset, which has no React counterpart.',
			};
		}
		if (!source.includes('@react-three/drei')) {
			throw new Error(`${path} needs an explicit non-differential classification`);
		}
		return {
			path,
			disposition: 'react-octane-differential',
			oracle:
				'Executes the same observable scenario against pinned @react-three/drei and @octanejs/drei in the test body.',
		};
	}),
};

const runtimeEvidence = {
	schemaVersion: 1,
	oracle: '@react-three/drei@10.7.7 with React 19 and @react-three/fiber@9.6.1',
	files: inventory.files.map((path) => {
		const contents = readFileSync(resolve(root, path));
		const assertions = tests.filter((test) => test.file === path);
		return {
			path,
			sha256: digest(contents),
			assertionCount: assertions.length,
			assertionInventorySha256: digest(assertions.map((test) => test.fullName).join('\n')),
		};
	}),
};

const upstreamArtifacts = {
	schemaVersion: 1,
	upstreamRuntimeSuite: 'insufficient',
	upstreamTypeSuite: 'absent',
	typeSuiteAudit: {
		searchedRoots: [
			'test',
			'tests',
			'src/__tests__',
			'src/__typetest__',
			'type-tests',
			'typetests',
		],
		result: 'No upstream type-test suite or @ts-expect-error assertion exists at the pinned tag.',
	},
	allowedTransformations: [],
	upstreamSourceExpectErrors: readdirRecursive(resolve(root, 'packages/drei/upstream/src'))
		.filter((path) => /\.[cm]?[jt]sx?$/.test(path))
		.flatMap((path) => {
			const relativePath = portable(relative(root, path));
			return readFileSync(path, 'utf8')
				.split('\n')
				.flatMap((line, index) =>
					line.includes('@ts-expect-error')
						? [{ path: relativePath, line: index + 1, sha256: digest(line.trim()) }]
						: [],
				);
		}),
	artifacts: [
		{
			path: 'packages/drei/upstream/test/e2e/App.tsx',
			disposition: 'upstream-e2e-fixture',
			reason:
				'Byte-exact fixture for the sole upstream screenshot scenario; local per-export differential tests provide reviewable behavioral coverage.',
		},
		{
			path: 'packages/drei/upstream/test/e2e/e2e.sh',
			disposition: 'upstream-e2e-runner',
			reason:
				'Byte-exact server/Playwright runner; not adapted because the Octane port has no one-for-one upstream application fixture.',
		},
		{
			path: 'packages/drei/upstream/test/e2e/snapshot.test.ts',
			disposition: 'upstream-e2e-test',
			reason:
				'The only upstream runtime test case, a whole-gallery screenshot; retained byte-exact and classified as insufficient for export-level parity.',
		},
		{
			path: 'packages/drei/upstream/test/e2e/snapshot.test.ts-snapshots/should-match-previous-one-1-linux.png',
			disposition: 'upstream-e2e-snapshot',
			reason: 'Byte-exact Linux screenshot oracle belonging to the sole upstream e2e case.',
		},
	].map((entry) => ({ ...entry, sha256: digest(readFileSync(resolve(root, entry.path))) })),
};

function readdirRecursive(directory) {
	return readdirSync(directory, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => resolve(entry.parentPath, entry.name));
}

const generatedFiles = [
	['adapted-runtime.json', inventory],
	['test-classifications.json', classifications],
	['runtime-evidence.json', runtimeEvidence],
	['upstream-test-artifacts.json', upstreamArtifacts],
];
for (const [name, value] of generatedFiles) {
	const destination = resolve(auditRoot, name);
	mkdirSync(dirname(destination), { recursive: true });
	writeFileSync(destination, `${JSON.stringify(value, null, 2)}\n`);
	console.log(`${portable(relative(root, destination))}: generated`);
}
execFileSync(
	process.execPath,
	[
		'node_modules/prettier/bin/prettier.cjs',
		'--write',
		...generatedFiles.map(([name]) => portable(relative(root, resolve(auditRoot, name)))),
	],
	{ cwd: root, stdio: 'ignore' },
);

const manifestPath = resolve(auditRoot, 'react-parity.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
manifest.environments['workspace-node'].lockfileSha256 = digest(
	readFileSync(resolve(root, manifest.environments['workspace-node'].lockfile)),
);
for (const lane of manifest.lanes) {
	for (const file of lane.files ?? []) {
		file.sha256 = digest(readFileSync(resolve(root, file.path)));
	}
}
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`${portable(relative(root, manifestPath))}: refreshed evidence hashes`);
