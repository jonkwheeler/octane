#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const sha256 = (path) =>
	createHash('sha256')
		.update(readFileSync(resolve(root, path)))
		.digest('hex');
const support = (path) => ({ path, role: 'support', sha256: sha256(path) });
const test = (path, cases) => ({ path, role: 'test', sha256: sha256(path), cases });

const manifest = {
	$schema: '../../hook-form/audit/react-parity.schema.json',
	schemaVersion: 1,
	provenance: {
		repo: 'https://github.com/remarkjs/react-markdown.git',
		version: '10.1.0',
		commit: '44d2e4a44b37461ab7778d6870c1a9eb36393ad2',
		sourceRoot: 'lib',
		testRoot: 'test.jsx',
		license: 'MIT',
		integrity: 'sha256:205f5c607c68e1e42b8d7a036326bdb3a105ae55e6469ecfcaf998004609d5f7',
		verification: 'verified',
	},
	upstreamSuites: { runtime: 'present', types: 'absent' },
	adaptedRoots: {
		source: {
			roots: ['packages/react-markdown/src'],
			include: ['\\.(?:[cm]?[jt]s|[jt]sx|tsrx)$'],
			exclude: [],
		},
		tests: {
			roots: ['packages/react-markdown/tests'],
			include: ['\\.(?:test|spec)\\.(?:[cm]?[jt]s|[jt]sx|tsrx)$'],
			exclude: ['packages/react-markdown/tests/pristine/'],
		},
	},
	adaptedRuntimeSummary: {
		inventoryEntries: 121,
		uniqueIdentities: 121,
		duplicateEntriesWithinLanes: 0,
		identitiesSharedAcrossLanes: 0,
	},
	environments: {
		'workspace-node': {
			node: '>=22',
			platform: 'any',
			arch: 'any',
			packageManager: 'pnpm@11.15.1',
			lockfile: 'pnpm-lock.yaml',
			lockfileSha256: sha256('pnpm-lock.yaml'),
		},
	},
	lanes: [
		{
			id: 'react-markdown-pristine-runtime',
			type: 'pristine-upstream',
			oracle: 'required',
			environment: 'workspace-node',
			project: 'react-markdown-pristine',
			evidenceOrigin: 'upstream-suite',
			notes:
				'Executes all 87 pinned upstream registrations against the pristine react-markdown 10.1.0 package while the exact source suite remains vendored and hashed.',
			execution: {
				kind: 'vitest-full',
				inventory: 'packages/react-markdown/audit/pristine-runtime.json',
			},
			files: [
				support('packages/react-markdown/tests/pristine/runtime.test.ts'),
				support('packages/react-markdown/audit/test-inventory.json'),
				support('packages/react-markdown/audit/pristine-runtime.json'),
				support('packages/react-markdown/upstream/source/test.jsx'),
			],
		},
		{
			id: 'react-markdown-adapted-runtime',
			type: 'adapted-octane',
			oracle: 'required',
			environment: 'workspace-node',
			project: 'react-markdown',
			evidenceOrigin: 'upstream-suite',
			notes:
				'Executes the complete adapted sync, async, hooks, SSR, hydration, validation, adoption, differential, and negative-control suite with exact identities.',
			execution: {
				kind: 'vitest-full',
				inventory: 'packages/react-markdown/audit/adapted-runtime.json',
			},
			files: [
				support('packages/react-markdown/audit/adapted-runtime.json'),
				support('scripts/react-parity/react-markdown-runtime-inventory.mjs'),
				support('vitest.config.js'),
			],
		},
		{
			id: 'react-markdown-differential',
			type: 'differential',
			oracle: 'required',
			environment: 'workspace-node',
			project: 'react-markdown',
			evidenceOrigin: 'repo-authored',
			notes:
				'Runs the same Markdown and URL fixtures through pristine React and Octane public entry points.',
			files: [
				test('packages/react-markdown/tests/parity/differential.test.ts', [
					{
						id: 'react-markdown:differential:sync',
						testName: 'sync Markdown output matches pristine React',
						fullName: 'sync Markdown output matches pristine React',
					},
					{
						id: 'react-markdown:differential:unsafe-url',
						testName: 'unsafe URL filtering matches pristine React',
						fullName: 'unsafe URL filtering matches pristine React',
					},
					{
						id: 'react-markdown:differential:image-preload',
						testName: 'image markup matches apart from React framework preloading',
						fullName: 'image markup matches apart from React framework preloading',
					},
				]),
			],
		},
		{
			id: 'react-markdown-pristine-types',
			type: 'pristine-types',
			oracle: 'required',
			environment: 'workspace-node',
			project: 'react-markdown-pristine-types',
			evidenceOrigin: 'repo-authored',
			execution: {
				kind: 'typescript',
				compiler: 'tsc',
				project: 'packages/react-markdown/typetests/pristine/tsconfig.json',
			},
			files: [
				test('packages/react-markdown/typetests/pristine/public-api.tsx', [
					{
						id: 'react-markdown:types:pristine',
						testName: 'pristine public type programs',
						fullName: 'pristine public type programs',
					},
				]),
				support('packages/react-markdown/typetests/pristine/tsconfig.json'),
			],
		},
		{
			id: 'react-markdown-adapted-types',
			type: 'adapted-types',
			oracle: 'required',
			environment: 'workspace-node',
			project: 'react-markdown-adapted-types',
			evidenceOrigin: 'repo-authored',
			execution: {
				kind: 'typescript',
				compiler: 'tsrx-tsc',
				project: 'packages/react-markdown/tsconfig.json',
			},
			files: [
				test('packages/react-markdown/typetests/public-api.test.ts', [
					{
						id: 'react-markdown:types:adapted',
						testName: 'adapted public type programs',
						fullName: 'adapted public type programs',
					},
				]),
				support('packages/react-markdown/tsconfig.json'),
			],
		},
	],
	divergences: [
		{
			id: 'react-markdown-react-image-preload',
			caseIds: ['react-markdown:differential:image-preload'],
			upstreamResult:
				'React 19 server rendering inserts an image preload link before Markdown image markup.',
			octaneResult:
				'Octane renders the equivalent image element without React framework-managed preloading.',
			rationale:
				'Automatic resource hint insertion belongs to the framework renderer rather than react-markdown.',
			classification: 'server-rendering',
			consumerImpact: 'Raw server markup lacks React 19 automatic image preload hints.',
			migrationGuidance:
				'Add an explicit preload hint when an above-the-fold Markdown image requires one.',
			owner: 'octane',
			reviewCondition: 'Review if Octane adds renderer-managed image resource hints.',
		},
	],
};

const destination = resolve(root, 'packages/react-markdown/audit/react-parity.json');
writeFileSync(
	destination,
	await format(JSON.stringify(manifest), {
		...(await resolveConfig(destination)),
		filepath: destination,
	}),
);
console.log('packages/react-markdown/audit/react-parity.json');
