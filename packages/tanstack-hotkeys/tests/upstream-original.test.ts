import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, parse, resolve } from 'node:path';
import { expect, it } from 'vitest';

function findRepoRoot(start: string): string {
	let directory = resolve(start);
	const filesystemRoot = parse(directory).root;
	while (directory !== filesystemRoot) {
		if (
			existsSync(resolve(directory, 'pnpm-workspace.yaml')) &&
			existsSync(resolve(directory, 'packages/tanstack-hotkeys/package.json'))
		) {
			return directory;
		}
		directory = dirname(directory);
	}
	throw new Error(`Could not locate the Octane repository above ${start}`);
}

const repoRoot = findRepoRoot(process.cwd());
const packageRoot = resolve(repoRoot, 'packages/tanstack-hotkeys');
const requireFromPackage = createRequire(resolve(packageRoot, 'package.json'));
const vitestBin = resolve(dirname(requireFromPackage.resolve('vitest/package.json')), 'vitest.mjs');

// @parity-case pristine:tanstack-react-hotkeys-original-suite
it('runs all 41 pinned @tanstack/react-hotkeys tests unchanged', function () {
	const result = spawnSync(
		process.execPath,
		[
			vitestBin,
			'run',
			'--config',
			resolve(packageRoot, 'tests/upstream-pristine.vitest.config.ts'),
			'--reporter=verbose',
		],
		{
			cwd: resolve(packageRoot, 'upstream/package'),
			encoding: 'utf8',
			env: {
				...process.env,
				// Keep the child process free of Octane JSX ambient types.
				NODE_OPTIONS: undefined,
			},
		},
	);
	const output = `${result.stdout}\n${result.stderr}`;
	expect(result.status, output).toBe(0);
	expect(output).toMatch(/Tests\s+41 passed/);
	const checksums = readFileSync(resolve(packageRoot, 'upstream/SHA256SUMS'), 'utf8');
	expect(checksums.split('\n').filter(Boolean).length).toBe(26);
}, 120_000);
