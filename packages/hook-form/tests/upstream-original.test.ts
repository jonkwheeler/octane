import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, parse, resolve } from 'node:path';
import { expect, it } from 'vitest';

import { verifyHookFormUpstream } from '../../../scripts/react-parity/hook-form-upstream-lib.mjs';

function findRepoRoot(start: string): string {
	let directory = resolve(start);
	const filesystemRoot = parse(directory).root;
	while (directory !== filesystemRoot) {
		if (
			existsSync(resolve(directory, 'pnpm-workspace.yaml')) &&
			existsSync(resolve(directory, 'packages/hook-form/package.json'))
		) {
			return directory;
		}
		directory = dirname(directory);
	}
	throw new Error(`Could not locate the Octane repository above ${start}`);
}

const repoRoot = findRepoRoot(process.cwd());
const upstreamRoot = resolve(repoRoot, 'packages/hook-form/upstream');
const jestBin = createRequire(resolve(repoRoot, 'packages/hook-form/package.json')).resolve(
	'jest/bin/jest',
);

// @parity-case pristine:react-hook-form-original-suite
it('runs all 1,193 pinned react-hook-form tests unchanged', () => {
	verifyHookFormUpstream(repoRoot);
	const result = spawnSync(
		process.execPath,
		[
			jestBin,
			'--config',
			resolve(repoRoot, 'packages/hook-form/tests/upstream-jest.config.cjs'),
			'--rootDir',
			upstreamRoot,
			'--runInBand',
			'--no-watchman',
		],
		{ cwd: repoRoot, encoding: 'utf8' },
	);
	const output = `${result.stdout}\n${result.stderr}`;
	expect(result.status, output).toBe(0);
	expect(output).toMatch(/Tests:\s+1193 passed, 1193 total/);
	expect(output).toMatch(/Snapshots:\s+8 passed, 8 total/);
}, 120_000);
