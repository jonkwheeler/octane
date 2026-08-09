import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, parse, resolve } from 'node:path';
import { expect, it } from 'vitest';

function findRepoRoot(start: string): string {
	let directory = resolve(start);
	const filesystemRoot = parse(directory).root;
	while (directory !== filesystemRoot) {
		if (
			existsSync(resolve(directory, 'pnpm-workspace.yaml')) &&
			existsSync(resolve(directory, 'packages/react-transition-group/package.json'))
		) {
			return directory;
		}
		directory = dirname(directory);
	}
	throw new Error(`Could not locate the Octane repository above ${start}`);
}

function pristineEnvironment(): NodeJS.ProcessEnv {
	const environment: NodeJS.ProcessEnv = { NODE_ENV: 'test' };
	for (const name of ['HOME', 'PATH', 'TMPDIR']) {
		if (process.env[name] !== undefined) environment[name] = process.env[name];
	}
	return environment;
}

const repoRoot = findRepoRoot(process.cwd());

// @parity-case pristine:react-transition-group-original-suite
it('runs all 56 pinned react-transition-group tests unchanged', function runPristineSuite() {
	const result = spawnSync(
		process.execPath,
		[
			resolve(repoRoot, 'scripts/react-parity/jest-full-runner.mjs'),
			'--config',
			'packages/react-transition-group/tests/upstream-jest.config.cjs',
			'--root',
			'packages/react-transition-group/upstream',
		],
		{ cwd: repoRoot, encoding: 'utf8', env: pristineEnvironment() },
	);
	const output = `${result.stdout}\n${result.stderr}`;
	expect(result.status, output).toBe(0);
	const expected = JSON.parse(
		readFileSync(
			resolve(repoRoot, 'packages/react-transition-group/audit/pristine-runtime.json'),
			'utf8',
		),
	).tests;
	const executed = JSON.parse(result.stdout).tests;
	expect(
		new Set(
			executed.map(function testFile(test: { file: string }) {
				return test.file;
			}),
		),
	).toHaveProperty('size', 7);
	expect(executed).toHaveLength(56);
	expect(executed).toEqual(expected);
}, 30_000);
