import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, parse, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { expect, it } from 'vitest';

import { verifyReactTransitionGroupUpstream } from '../../../scripts/react-parity/react-transition-group-upstream-lib.mjs';
import { pristineTestIdentities } from '../../../scripts/react-parity/react-transition-group-pristine-runtime.mjs';

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

const repoRoot = findRepoRoot(process.cwd());
const upstreamRoot = resolve(repoRoot, 'packages/react-transition-group/upstream');
const jestBin = createRequire(
	resolve(repoRoot, 'packages/react-transition-group/package.json'),
).resolve('jest/bin/jest');

// @parity-case pristine:react-transition-group-original-suite
it('runs all pinned react-transition-group tests unchanged', function runsPinnedSuite() {
	verifyReactTransitionGroupUpstream(repoRoot);
	const report = join(tmpdir(), `octane-react-transition-group-pristine-${process.pid}.json`);
	const result = spawnSync(
		process.execPath,
		[
			jestBin,
			'--config',
			resolve(repoRoot, 'packages/react-transition-group/tests/upstream-jest.config.cjs'),
			'--rootDir',
			upstreamRoot,
			'--runInBand',
			'--no-watchman',
			'--json',
			`--outputFile=${report}`,
		],
		{ cwd: repoRoot, encoding: 'utf8' },
	);
	const output = `${result.stdout}\n${result.stderr}`;
	expect(result.status, output).toBe(0);
	const expected = JSON.parse(
		readFileSync(
			resolve(repoRoot, 'packages/react-transition-group/audit/pristine-runtime.json'),
			'utf8',
		),
	).tests;
	const executed = pristineTestIdentities(JSON.parse(readFileSync(report, 'utf8')), repoRoot);
	expect(executed).toEqual(expected);
}, 120_000);
