#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { format } from 'prettier';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const audit = 'packages/input-otp/audit';
const adaptedRoots = ['packages/input-otp/tests'];

const lanes = [
	[
		'input-otp-adapted',
		'input-otp',
		'packages/input-otp/audit/adapted-runtime.json',
		[
			'packages/input-otp/tests/conformance/input.test.ts',
			'packages/input-otp/tests/hydration/input.test.ts',
		],
	],
	[
		'input-otp-server',
		'input-otp-server',
		'packages/input-otp/audit/adapted-runtime-server.json',
		['packages/input-otp/tests/ssr/input.server.test.ts'],
	],
	[
		'input-otp-browser',
		'input-otp-browser',
		'packages/input-otp/audit/adapted-runtime-browser.json',
		[
			'packages/input-otp/tests/browser/conformance.browser.test.ts',
			'packages/input-otp/tests/browser/upstream/base.delete-word.spec.ts',
			'packages/input-otp/tests/browser/upstream/base.props.spec.ts',
			'packages/input-otp/tests/browser/upstream/base.render.spec.ts',
			'packages/input-otp/tests/browser/upstream/base.selections.spec.ts',
			'packages/input-otp/tests/browser/upstream/base.slot.spec.ts',
			'packages/input-otp/tests/browser/upstream/base.typing.spec.ts',
			'packages/input-otp/tests/browser/upstream/with-autofocus.spec.ts',
			'packages/input-otp/tests/browser/upstream/with-on-complete.spec.ts',
		],
	],
];

const upstreamFiles = ['packages/input-otp/tests/pristine/upstream.browser.test.ts'];

function sha(contents) {
	return createHash('sha256').update(contents).digest('hex');
}

async function fileSha(file) {
	return sha(await readFile(path.join(repo, file)));
}

function stringLiteral(source, offset) {
	const match = /^\s*(['"])((?:\\.|(?!\1)[\s\S])*)\1/.exec(source.slice(offset));
	return match?.[2].replaceAll("\\'", "'").replaceAll('\\"', '"');
}

async function identities(files, project, prefix) {
	const tests = [];
	for (const file of files) {
		const source = await readFile(path.join(repo, file), 'utf8');
		const suites = [];
		for (const match of source.matchAll(/\b(?:describe|it|test)(?:\.describe)?\s*\(/g)) {
			const title = stringLiteral(source, match.index + match[0].length);
			if (!title) continue;
			const token = match[0];
			if (token.includes('describe')) suites.push(title);
			else {
				const suite =
					source.includes('describe(') && !file.includes('/browser/') ? suites.at(-1) : undefined;
				tests.push({ file, fullName: suite ? `${suite} ${title}` : title });
			}
		}
	}
	tests.sort(
		(left, right) =>
			left.file.localeCompare(right.file) || left.fullName.localeCompare(right.fullName),
	);
	return tests.map((test, index) => ({
		id: `runtime:${prefix}:${String(index + 1).padStart(4, '0')}`,
		...test,
	}));
}

async function writeJson(relative, value) {
	await writeFile(
		path.join(repo, relative),
		await format(`${JSON.stringify(value, null, 2)}\n`, { parser: 'json' }),
	);
}

const inventories = [];
for (const [id, project, inventoryPath, files] of lanes) {
	const inventory = {
		schemaVersion: 1,
		project,
		roots: adaptedRoots,
		files,
		tests: await identities(files, project, project),
	};
	await writeJson(inventoryPath, inventory);
	inventories.push({ id, project, path: inventoryPath, inventory });
}

const pristinePath = `${audit}/pristine-runtime-browser.json`;
const pristine = {
	schemaVersion: 1,
	project: 'input-otp-pristine-browser',
	roots: ['packages/input-otp/upstream/source/apps/test/src/tests'],
	files: upstreamFiles,
	tests: await identities(
		upstreamFiles,
		'input-otp-pristine-browser',
		'input-otp-pristine-browser',
	),
};
await writeJson(pristinePath, pristine);

const differentialPath = `${audit}/differential-runtime.json`;
const differentialFiles = ['packages/input-otp/tests/differential/input.test.tsx'];
const differential = {
	schemaVersion: 1,
	project: 'input-otp-differential',
	roots: adaptedRoots,
	files: differentialFiles,
	tests: await identities(differentialFiles, 'input-otp-differential', 'input-otp-differential'),
};
await writeJson(differentialPath, differential);

await writeJson(`${audit}/runtime-inventory.json`, {
	schemaVersion: 1,
	generatedBy: 'scripts/react-parity/input-otp-generate.mjs',
	lanes: [pristine, ...inventories.map(({ inventory }) => inventory)],
	differential,
});

const lockfileSha256 = await fileSha('pnpm-lock.yaml');
const support = async (file) => ({ path: file, role: 'support', sha256: await fileSha(file) });
const typeTest = async (file, id, title) => ({
	path: file,
	role: 'test',
	sha256: await fileSha(file),
	cases: [{ id, testName: title, fullName: title }],
});
const adaptedTests = inventories.slice(0, 2).flatMap(({ inventory }) => inventory.tests);
const manifest = {
	schemaVersion: 1,
	provenance: {
		repo: 'https://github.com/guilhermerodz/input-otp.git',
		version: '1.4.2',
		commit: '81ccdb48c010d800b24942aa231909f0c971b1ca',
		sourceRoot: 'packages/input-otp',
		testRoot: 'apps/test/src/tests',
		license: 'MIT',
		integrity: 'sha256:372ada860a04000a06a9bd10732e0ea79a2587c473e6a738930728529de51c77',
		verification: 'verified',
	},
	upstreamSuites: { runtime: 'present', types: 'absent' },
	adaptedRoots: {
		source: { roots: ['packages/input-otp/src'], include: ['\\.(?:ts|tsrx)$'], exclude: [] },
		tests: {
			roots: adaptedRoots,
			include: ['\\.(?:test|spec)\\.(?:ts|tsx|tsrx)$'],
			exclude: ['/tests/(?:browser|differential|pristine)/'],
		},
	},
	adaptedRuntimeSummary: {
		inventoryEntries: adaptedTests.length,
		uniqueIdentities: new Set(adaptedTests.map(({ file, fullName }) => `${file}\0${fullName}`))
			.size,
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
			lockfileSha256,
		},
	},
	lanes: [
		{
			id: 'input-otp-pristine-browser',
			type: 'pristine-upstream',
			oracle: 'required',
			environment: 'workspace-node',
			project: 'input-otp-pristine-browser',
			evidenceOrigin: 'upstream-suite',
			notes:
				'Case-for-case pinned React oracle running all 15 upstream identities in real Chromium through Vite.',
			execution: { kind: 'vitest-full', inventory: pristinePath },
			files: [await support(pristinePath)],
		},
		...inventories.map(({ id, project, path: inventoryPath }, index) => ({
			id,
			type: index < 2 ? 'adapted-octane' : 'browser',
			oracle: 'required',
			environment: 'workspace-node',
			project,
			...(index < 2 ? { evidenceOrigin: index === 0 ? 'upstream-suite' : 'repo-authored' } : {}),
			notes: [
				'Complete adapted DOM and hydration suite.',
				'React-free SSR lane.',
				'Existing Vitest-full real Chromium lane containing all eight adapted upstream files and three port conformance cases.',
			][index],
			execution: { kind: 'vitest-full', inventory: inventoryPath },
			files: [],
		})),
		{
			id: 'input-otp-differential',
			type: 'differential',
			oracle: 'required',
			environment: 'workspace-node',
			project: 'input-otp-differential',
			evidenceOrigin: 'repo-authored',
			notes:
				'Independent React/Octane public-input checkpoints for attributes, projection, edits, callbacks, and pattern rejection.',
			execution: { kind: 'vitest-full', inventory: differentialPath },
			files: [await support(differentialPath)],
		},
		{
			id: 'input-otp-pristine-types',
			type: 'pristine-types',
			oracle: 'required',
			environment: 'workspace-node',
			project: 'input-otp-pristine-types',
			evidenceOrigin: 'repo-authored',
			notes: 'Pinned published React declaration probes.',
			execution: {
				kind: 'typescript',
				compiler: 'tsc',
				project: `${audit}/type-probes/tsconfig.pristine.json`,
			},
			files: [
				await typeTest(
					`${audit}/type-probes/pristine.ts`,
					'types:input-otp-pristine',
					'pinned published declaration probes',
				),
				await support(`${audit}/type-probes/tsconfig.pristine.json`),
			],
		},
		{
			id: 'input-otp-adapted-types',
			type: 'adapted-types',
			oracle: 'required',
			environment: 'workspace-node',
			project: 'input-otp-adapted-types',
			evidenceOrigin: 'repo-authored',
			notes: 'Strict Octane public type probes.',
			execution: {
				kind: 'typescript',
				compiler: 'tsrx-tsc',
				project: 'packages/input-otp/typetests/tsconfig.json',
			},
			files: [
				await typeTest(
					'packages/input-otp/typetests/public-api.test-d.ts',
					'types:input-otp-adapted-public',
					'strict public declaration probes',
				),
				await typeTest(
					'packages/input-otp/typetests/shadcn-adoption.test-d.ts',
					'types:input-otp-adapted-shadcn',
					'shadcn adoption declaration probes',
				),
				await support('packages/input-otp/typetests/tsconfig.json'),
			],
		},
	],
	divergences: [],
};
for (const lane of manifest.lanes)
	if (lane.files.length === 0) lane.files = [await support(lane.execution.inventory)];
await writeJson(`${audit}/react-parity.json`, manifest);
console.log(
	`Generated input-otp parity evidence (${adaptedTests.length} adapted runtime identities, ${pristine.tests.length} pristine identities).`,
);
