#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { summarizeRuntimeInventories } from './harness-lib.mjs';

const root = resolve(import.meta.dirname, '../..');
const manifestPath = 'packages/floating-ui/audit/react-parity.json';
const hashCache = new Map();

function sha256(path) {
	if (!hashCache.has(path)) {
		hashCache.set(
			path,
			createHash('sha256')
				.update(readFileSync(resolve(root, path)))
				.digest('hex'),
		);
	}
	return hashCache.get(path);
}

function evidence(path, role = 'support', cases) {
	return { path, role, sha256: sha256(path), ...(cases ? { cases } : {}) };
}

const environment = 'workspace-node';
const runtimeShared = [
	'packages/floating-ui/audit/runtime-parity.json',
	'packages/floating-ui/audit/upstream.lock.json',
	'packages/floating-ui/LICENSE.upstream',
	'scripts/react-parity/floating-ui-evidence-lib.mjs',
	'scripts/react-parity/floating-ui-upstream-runtime.mjs',
	'vitest.config.js',
];
const adaptationEvidence = [
	'packages/floating-ui/audit/upstream-patches/tests/upstream/index.test-d.tsx.patch',
	'packages/floating-ui/audit/upstream-patches/tests/upstream/unit/FloatingFocusManager.test.tsx.patch',
	'packages/floating-ui/audit/upstream-patches/tests/upstream/unit/NextFloatingDelayGroup.test.tsx.patch',
	'packages/floating-ui/audit/upstream-patches/tests/upstream/unit/useListNavigation.test.tsx.patch',
	'packages/floating-ui/audit/upstream-patches/tests/upstream/visual/components/EmojiPicker.tsx.patch',
	'packages/floating-ui/tests/_support/adapted-vitest.config.ts',
	'packages/floating-ui/tests/_support/focus-manager-visuals.tsx',
	'packages/floating-ui/tests/_support/octane-react-compat.ts',
	'packages/floating-ui/tests/_support/radix-checkbox.tsx',
	'packages/floating-ui/tests/_support/radix-icons.tsx',
];
const typeCases = (side) =>
	['App', 'NarrowRefType', 'Root'].map((name) => ({
		id: `types:floating-ui-${side}-${name}`,
		testName: `${name} upstream type program`,
		fullName: `${name} upstream type program`,
	}));

function runtimeLane({ id, type, project, inventory, fullInventory, wrapper, notes, support }) {
	return {
		id,
		type,
		oracle: 'required',
		environment,
		project,
		evidenceOrigin: 'upstream-suite',
		notes,
		execution: { kind: 'vitest-full', inventory },
		files: [
			evidence(inventory),
			evidence(fullInventory),
			evidence(wrapper),
			...runtimeShared.map((path) => evidence(path)),
			...support.map((path) => evidence(path)),
		],
	};
}

function typeLane({ id, type, compiler, project, inventory, source, side, notes }) {
	return {
		id,
		type,
		oracle: 'required',
		environment,
		project: id,
		evidenceOrigin: 'upstream-suite',
		notes,
		execution: { kind: 'typescript', compiler, project },
		files: [
			evidence(inventory, 'test', typeCases(side)),
			evidence(project),
			evidence(source),
			evidence('packages/floating-ui/audit/type-parity.json'),
			evidence('packages/floating-ui/audit/upstream.lock.json'),
			evidence('scripts/react-parity/floating-ui-types-lib.mjs'),
		],
	};
}

const adaptedWrapperInventory = JSON.parse(
	readFileSync(resolve(root, 'packages/floating-ui/audit/adapted-wrapper-runtime.json'), 'utf8'),
);

const manifest = {
	$schema: '../../hook-form/audit/react-parity.schema.json',
	schemaVersion: 1,
	provenance: {
		repo: 'https://github.com/floating-ui/floating-ui.git',
		version: '@floating-ui/react@0.27.19',
		commit: 'd8020ee98c702caa31fa9b4d929ca782c6b58c59',
		sourceRoot: 'packages/react/src',
		testRoot: 'packages/react/test',
		license: 'MIT',
		integrity: 'sha256:55480b7a99c1bffdc662c4b67492503bd7d7705b82c43e1fcb522e71a07e695b',
		verification: 'verified',
	},
	upstreamSuites: { runtime: 'present', types: 'present' },
	adaptedRoots: {
		source: {
			roots: ['packages/floating-ui/src'],
			include: ['\\.ts$'],
			exclude: [],
		},
		tests: {
			roots: ['packages/floating-ui/tests/parity'],
			include: ['adapted-upstream\\.test\\.ts$'],
			exclude: [],
		},
	},
	adaptedRuntimeSummary: summarizeRuntimeInventories([adaptedWrapperInventory]),
	environments: {
		[environment]: {
			node: '>=22',
			platform: 'any',
			arch: 'any',
			packageManager: 'pnpm@11.15.1',
			lockfile: 'pnpm-lock.yaml',
			lockfileSha256: sha256('pnpm-lock.yaml'),
		},
	},
	lanes: [
		runtimeLane({
			id: 'floating-ui-pristine-upstream',
			type: 'pristine-upstream',
			project: 'floating-ui-pristine',
			inventory: 'packages/floating-ui/audit/pristine-wrapper-runtime.json',
			fullInventory: 'packages/floating-ui/audit/pristine-runtime.json',
			wrapper: 'packages/floating-ui/tests/parity/pristine-upstream.test.ts',
			notes:
				'Runs all 286 passing assertions and retains all 6 upstream skips from the byte-exact @floating-ui/react@0.27.19 Vitest suite under its exact React 18, Vitest 3, Vite 6, and jsdom 26 stack. The single manifest-visible wrapper registration fails on any child inventory drift.',
			support: ['packages/floating-ui/tests/_support/upstream-vitest.config.ts'],
		}),
		runtimeLane({
			id: 'floating-ui-adapted-upstream',
			type: 'adapted-octane',
			project: 'floating-ui-upstream-adapted',
			inventory: 'packages/floating-ui/audit/adapted-wrapper-runtime.json',
			fullInventory: 'packages/floating-ui/audit/adapted-runtime.json',
			wrapper: 'packages/floating-ui/tests/parity/adapted-upstream.test.ts',
			notes:
				'Runs the deterministic Octane adaptation under the same pinned runner stack: 286 passing assertions, 6 upstream skips, and zero omissions. The wrapper verifies its child report against the committed full inventory; the crosswalk rejects deleted or renamed identities.',
			support: adaptationEvidence,
		}),
		typeLane({
			id: 'floating-ui-pristine-types',
			type: 'pristine-types',
			compiler: 'tsc',
			project: 'packages/floating-ui/audit/upstream-typetests/tsconfig.pristine.json',
			inventory: 'packages/floating-ui/audit/pristine-types.json',
			source: 'packages/floating-ui/upstream/test/index.test-d.tsx',
			side: 'pristine',
			notes:
				'Compiles the byte-exact upstream type program with TypeScript and its pinned React 18 declarations.',
		}),
		typeLane({
			id: 'floating-ui-adapted-upstream-types',
			type: 'adapted-types',
			compiler: 'tsrx-tsc',
			project: 'packages/floating-ui/typetests/tsconfig.upstream-adapted.json',
			inventory: 'packages/floating-ui/audit/adapted-upstream-types.json',
			source: 'packages/floating-ui/tests/upstream/index.test-d.tsx',
			side: 'adapted',
			notes:
				'Compiles the structurally crosswalked Octane adaptation of every upstream type-program group.',
		}),
		{
			id: 'floating-ui-runtime-differential',
			type: 'differential',
			oracle: 'required',
			environment,
			project: 'floating-ui-differential',
			evidenceOrigin: 'repo-authored',
			notes:
				'Compiles the existing TwoTooltips fixture for both adapters and compares independent hook placement output.',
			files: [
				evidence('packages/floating-ui/tests/differential/parity.test.ts', 'test', [
					{
						id: 'differential:floating-ui-hook-isolation',
						testName: 'keeps independent useFloating placements byte-identical',
						fullName:
							'differential: @octanejs/floating-ui vs @floating-ui/react keeps independent useFloating placements byte-identical',
					},
				]),
				evidence('packages/floating-ui/tests/differential/_setup.ts'),
				evidence('packages/floating-ui/tests/_support/react18-act-compat.ts'),
				evidence('packages/floating-ui/tests/differential/fixture-compiler.mjs'),
				evidence('packages/floating-ui/tests/differential/compile-runner.mjs'),
				evidence('packages/floating-ui/tests/_fixtures/tooltip.tsx'),
			],
		},
		{
			id: 'floating-ui-public-api-types',
			type: 'adapted-types',
			oracle: 'required',
			environment,
			project: 'floating-ui-public-api-types',
			evidenceOrigin: 'repo-authored',
			notes: 'Compiles the broader repository-authored Octane public API contract.',
			execution: {
				kind: 'typescript',
				compiler: 'tsrx-tsc',
				project: 'packages/floating-ui/typetests/tsconfig.json',
			},
			files: [
				evidence('packages/floating-ui/audit/adapted-types.json', 'test', [
					{
						id: 'types:floating-ui-public-api',
						testName: 'Floating UI public declarations',
						fullName: 'Floating UI public declarations',
					},
				]),
				evidence('packages/floating-ui/typetests/public-api.test-d.ts'),
				evidence('packages/floating-ui/typetests/tsconfig.json'),
			],
		},
	],
	divergences: [
		{
			id: 'ref-as-prop',
			caseIds: ['differential:floating-ui-hook-isolation'],
			upstreamResult:
				"React component refs use React's ref channel and forwardRef where components forward a ref.",
			octaneResult: 'Octane component APIs receive and forward ref as an ordinary prop.',
			rationale:
				"Octane implements ref-as-prop natively and does not require React's forwardRef wrapper.",
			classification: 'framework-integration',
			consumerImpact:
				'Callers pass the same ref attribute, but custom component implementations receive it as a prop.',
			migrationGuidance:
				'Accept ref in component props instead of wrapping the component in forwardRef.',
			owner: '@octanejs/floating-ui',
			reviewCondition: 'Review if Octane adopts a distinct ref forwarding primitive.',
		},
	],
};

writeFileSync(resolve(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(manifestPath);
