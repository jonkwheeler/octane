import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
	buildLaneArgv,
	nodeMajorSatisfies,
	validateManifest,
	verifyLaneCollectedTests,
	verifyLaneEnvironment,
	verifyLaneRunResult,
	verifyManifestFiles,
} from './harness-lib.mjs';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function manifest(overrides = {}) {
	return {
		schemaVersion: 1,
		provenance: {
			repo: 'https://github.com/react-hook-form/react-hook-form.git',
			version: '7.81.0',
			commit: '46b217e034dd92f7aa3cb3a478815556b416b299',
			sourceRoot: 'src',
			testRoot: 'src/__tests__',
			license: 'MIT',
			integrity: `sha256:${'0'.repeat(64)}`,
			verification: 'recorded-unverified',
		},
		environments: {
			local: {
				node: '>=22',
				platform: 'any',
				arch: 'any',
				packageManager: 'pnpm@11.15.1',
				lockfile: 'pnpm-lock.yaml',
				lockfileSha256: sha256('lockfile'),
			},
		},
		lanes: [
			{
				id: 'adapted',
				type: 'adapted-octane',
				oracle: 'required',
				environment: 'local',
				project: 'hook-form',
				files: [
					{
						path: 'packages/hook-form/tests/upstream/example.test.ts',
						role: 'test',
						sha256: sha256('example'),
						cases: [
							{
								id: 'adapted:example',
								testName: 'does the thing',
								fullName: 'example suite does the thing',
							},
						],
					},
				],
			},
		],
		divergences: [],
		...overrides,
	};
}

function divergence(overrides = {}) {
	return {
		id: 'native-input',
		caseIds: ['adapted:example'],
		upstreamResult: 'Controller exposes field.onChange.',
		octaneResult: 'Controller exposes field.onInput.',
		rationale: 'Octane uses native input events.',
		owner: '@octanejs/hook-form',
		reviewCondition: 'Review if Octane adds React-compatible synthetic events.',
		...overrides,
	};
}

test('accepts distinct lane types and builds deterministic argv without a shell', () => {
	const value = manifest();
	assert.deepEqual(validateManifest(value), value);
	assert.deepEqual(buildLaneArgv(value.lanes[0]), [
		process.execPath,
		'node_modules/vitest/vitest.mjs',
		'run',
		'--project',
		'hook-form',
		'-t',
		'^(?:example suite does the thing)$',
		'packages/hook-form/tests/upstream/example.test.ts',
		'--reporter=json',
	]);
});

test('rejects successful Vitest runs that skipped declared cases', () => {
	const lane = manifest().lanes[0];
	assert.equal(
		verifyLaneRunResult(lane, JSON.stringify({ numPassedTests: 1, numPendingTests: 0 })),
		true,
	);
	assert.throws(
		() => verifyLaneRunResult(lane, JSON.stringify({ numPassedTests: 0, numPendingTests: 1 })),
		/executed 0 of 1 declared tests \(1 skipped\)/,
	);
});

test('accepts explicit TypeScript lanes and builds portable compiler argv without a shell', () => {
	const lane = {
		...manifest().lanes[0],
		id: 'pristine-types',
		type: 'pristine-types',
		project: 'hook-form-pristine-types',
		execution: {
			kind: 'typescript',
			compiler: 'tsc',
			project: 'packages/hook-form/upstream/src/__typetest__/tsconfig.json',
		},
	};
	const value = manifest({ lanes: [lane] });
	assert.deepEqual(validateManifest(value), value);
	assert.deepEqual(buildLaneArgv(lane), [
		process.execPath,
		'node_modules/typescript/bin/tsc',
		'--noEmit',
		'-p',
		'packages/hook-form/upstream/src/__typetest__/tsconfig.json',
	]);
});

test('uses Node package entrypoints for every TypeScript compiler', () => {
	const lane = {
		...manifest().lanes[0],
		execution: {
			kind: 'typescript',
			compiler: 'tsc',
			project: 'tsconfig.json',
		},
	};
	const entrypoints = {
		tsc: 'node_modules/typescript/bin/tsc',
		tsgo: 'node_modules/@typescript/native-preview/bin/tsgo',
		'tsrx-tsc': 'node_modules/@tsrx/typescript-plugin/dist/tsc.js',
	};

	for (const [compiler, entrypoint] of Object.entries(entrypoints)) {
		assert.deepEqual(buildLaneArgv({ ...lane, execution: { ...lane.execution, compiler } }), [
			process.execPath,
			entrypoint,
			'--noEmit',
			'-p',
			'tsconfig.json',
		]);
	}
});

test('matches the exact Vitest full name instead of another title with the same suffix', () => {
	const pattern = new RegExp(buildLaneArgv(manifest().lanes[0])[6]);
	assert.equal(pattern.test('example suite does the thing'), true);
	assert.equal(pattern.test('other suite example suite does the thing'), false);
});

test('rejects a stale fullName that Vitest does not collect from its evidence file', () => {
	const value = manifest();
	const root = '/repo';
	assert.throws(
		() =>
			verifyLaneCollectedTests(
				value.lanes[0],
				[
					{
						name: 'example suite renamed the thing',
						file: '/repo/packages/hook-form/tests/upstream/example.test.ts',
					},
				],
				root,
			),
		/fullName must match exactly one collected Vitest test/,
	);
});

test('rejects duplicate lane and case ids', () => {
	const duplicateLane = manifest({ lanes: [manifest().lanes[0], manifest().lanes[0]] });
	assert.throws(() => validateManifest(duplicateLane), /duplicate lane id "adapted"/);

	const duplicateCase = manifest();
	duplicateCase.lanes[0].files[0].cases.push({
		id: 'adapted:example',
		testName: 'again',
		fullName: 'example suite again',
	});
	assert.throws(() => validateManifest(duplicateCase), /duplicate case id "adapted:example"/);
});

test('rejects lanes without executable cases', () => {
	const value = manifest();
	value.lanes[0].files = [
		{
			path: 'packages/hook-form/tests/upstream/helper.ts',
			role: 'support',
			sha256: sha256('helper'),
		},
	];
	assert.throws(() => validateManifest(value), /must declare at least one executable case/);
	assert.throws(() => buildLaneArgv(value.lanes[0]), /has no executable cases/);
});

test('rejects broad file patterns, regex skips, and raw shell commands', () => {
	for (const path of ['packages/**/*.test.ts', 'packages/hook-form/tests/.*', '/test\\.ts$/']) {
		const value = manifest();
		value.lanes[0].files[0].path = path;
		assert.throws(() => validateManifest(value), /exact relative file path/);
	}
	const value = manifest();
	value.lanes[0].command = 'pnpm test && echo passed';
	assert.throws(() => validateManifest(value), /unknown key "command"/);
});

test('requires complete immutable provenance and environment identity', () => {
	for (const field of [
		'repo',
		'version',
		'commit',
		'sourceRoot',
		'testRoot',
		'license',
		'integrity',
	]) {
		const value = manifest();
		delete value.provenance[field];
		assert.throws(() => validateManifest(value), new RegExp(`provenance\\.${field}`));
	}
	const value = manifest();
	delete value.environments.local.lockfile;
	assert.throws(() => validateManifest(value), /environments\.local\.lockfile/);

	const shortCommit = manifest();
	shortCommit.provenance.commit = 'b7df98c2';
	assert.throws(() => validateManifest(shortCommit), /full 40-character Git commit/);

	const partialIntegrity = manifest();
	partialIntegrity.provenance.integrity = 'sha256:0123456789abcdef';
	assert.throws(() => validateManifest(partialIntegrity), /complete sha256 digest/);
});

test('requires a live pristine lane before provenance can be verified', () => {
	const value = manifest();
	value.provenance.verification = 'verified';
	assert.throws(
		() => validateManifest(value),
		/requires an available required pristine-upstream lane/,
	);
	value.lanes[0].type = 'pristine-upstream';
	assert.doesNotThrow(() => validateManifest(value));
});

test('evaluates exact and minimum Node major requirements', () => {
	assert.equal(nodeMajorSatisfies('>=22', 22), true);
	assert.equal(nodeMajorSatisfies('>=22', 24), true);
	assert.equal(nodeMajorSatisfies('>=22', 20), false);
	assert.equal(nodeMajorSatisfies('22', 22), true);
	assert.equal(nodeMajorSatisfies('22', 24), false);
	assert.throws(() => nodeMajorSatisfies('^22', 22), /Unsupported Node requirement/);
});

test('rejects stale divergences and one divergence matching multiple cases', () => {
	const stale = manifest({
		divergences: [divergence({ caseIds: ['missing'] })],
	});
	assert.throws(() => validateManifest(stale), /unknown case id "missing"/);

	const broad = manifest({
		divergences: [divergence({ caseIds: ['adapted:example', 'adapted:other'] })],
	});
	assert.throws(() => validateManifest(broad), /exactly one case id/);

	for (const field of ['upstreamResult', 'octaneResult', 'rationale', 'owner', 'reviewCondition']) {
		const incomplete = manifest({ divergences: [divergence()] });
		delete incomplete.divergences[0][field];
		assert.throws(() => validateManifest(incomplete), new RegExp(field));
	}
});

test('rejects missing and tampered evidence files', async () => {
	const root = await mkdtemp(join(tmpdir(), 'react-parity-'));
	const value = manifest();
	await assert.rejects(() => verifyManifestFiles(value, root), /missing evidence file/);

	const file = join(root, value.lanes[0].files[0].path);
	await mkdir(file.slice(0, file.lastIndexOf('/')), { recursive: true });
	await writeFile(file, 'tampered');
	await assert.rejects(() => verifyManifestFiles(value, root), /integrity mismatch/);
});

test('rejects environment drift during validation', async () => {
	const root = await mkdtemp(join(tmpdir(), 'react-parity-environment-'));
	const value = manifest();
	await writeFile(join(root, 'pnpm-lock.yaml'), 'changed lockfile');
	await assert.rejects(
		() => verifyLaneEnvironment(value, value.lanes[0], root, '11.15.1'),
		/lockfile integrity mismatch/,
	);
});

test('matches parity markers by exact id instead of shared prefix', async () => {
	const root = await mkdtemp(join(tmpdir(), 'react-parity-markers-'));
	const value = manifest();
	const source = `
// @parity-case adapted:example
it('does the thing', () => {});
// @parity-case adapted:example-extra
it('does the extra thing', () => {});
`;
	value.lanes[0].files[0].cases.push({
		id: 'adapted:example-extra',
		testName: 'does the extra thing',
		fullName: 'example suite does the extra thing',
	});
	value.lanes[0].files[0].sha256 = sha256(source);
	const file = join(root, value.lanes[0].files[0].path);
	await mkdir(file.slice(0, file.lastIndexOf('/')), { recursive: true });
	await writeFile(file, source);
	await assert.doesNotReject(() => verifyManifestFiles(value, root));
});

test('requires a parity marker to bind to the immediately following exact test', async () => {
	const root = await mkdtemp(join(tmpdir(), 'react-parity-neighbor-'));
	const value = manifest();
	const source = `
// @parity-case adapted:example
it('a neighboring test', () => {});
it('does the thing', () => {});
`;
	value.lanes[0].files[0].sha256 = sha256(source);
	const file = join(root, value.lanes[0].files[0].path);
	await mkdir(file.slice(0, file.lastIndexOf('/')), { recursive: true });
	await writeFile(file, source);
	await assert.rejects(
		() => verifyManifestFiles(value, root),
		/must immediately precede one active test named "does the thing"/,
	);
});

test('an unavailable optional oracle is never reported as parity evidence', () => {
	const value = manifest();
	value.lanes[0].oracle = 'optional';
	value.lanes[0].available = false;
	assert.throws(
		() => buildLaneArgv(value.lanes[0]),
		/optional oracle is unavailable; parity not established/,
	);
});

test('rejects additional properties at every strict manifest level', () => {
	for (const mutate of [
		(value) => (value.extra = true),
		(value) => (value.provenance.extra = true),
		(value) => (value.environments.local.extra = true),
		(value) => (value.lanes[0].files[0].extra = true),
		(value) => (value.divergences = [divergence({ extra: true })]),
	]) {
		const value = manifest();
		mutate(value);
		assert.throws(() => validateManifest(value), /unknown key/);
	}
	const value = manifest({ environments: {} });
	assert.throws(() => validateManifest(value), /environments must be non-empty/);
});

test('CLI validates, lists, and rejects malformed invocations', () => {
	const cli = join(import.meta.dirname, 'harness.mjs');
	const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
	assert.equal(run('validate').status, 0);
	const listed = run('list');
	assert.equal(listed.status, 0);
	assert.match(listed.stdout, /hook-form-pristine-upstream.*verified/);
	for (const args of [
		['wat'],
		['validate', '--wat', 'x'],
		['validate', '--manifest'],
		['run', '--lane'],
		['run', '--lane', 'missing'],
	]) {
		assert.notEqual(run(...args).status, 0, args.join(' '));
	}
});
