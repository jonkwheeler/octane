import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, parse, resolve } from 'node:path';
import { expect, it } from 'vitest';

import { pristineTestIdentities } from '../../../scripts/react-parity/react-select-pristine-runtime.mjs';

function findRepoRoot(start: string): string {
	let directory = resolve(start);
	const filesystemRoot = parse(directory).root;
	while (directory !== filesystemRoot) {
		if (
			existsSync(resolve(directory, 'pnpm-workspace.yaml')) &&
			existsSync(resolve(directory, 'packages/react-select/package.json'))
		) {
			return directory;
		}
		directory = dirname(directory);
	}
	throw new Error(`Could not locate the Octane repository above ${start}`);
}

const repoRoot = findRepoRoot(process.cwd());
const upstreamRoot = resolve(repoRoot, 'packages/react-select/upstream');
const jestBin = createRequire(resolve(repoRoot, 'packages/react-select/package.json')).resolve(
	'jest/bin/jest',
);

// @parity-case pristine:react-select-original-suite
it('runs all 255 passing pinned react-select identities unchanged', function () {
	const verification = spawnSync(
		process.execPath,
		[resolve(repoRoot, 'packages/react-select/scripts/verify-upstream.mjs')],
		{ cwd: repoRoot, encoding: 'utf8' },
	);
	expect(verification.status, `${verification.stdout}\n${verification.stderr}`).toBe(0);

	const report = join(tmpdir(), `octane-react-select-pristine-${process.pid}.json`);
	const result = spawnSync(
		process.execPath,
		[
			jestBin,
			'--config',
			resolve(repoRoot, 'packages/react-select/tests/upstream-jest.config.cjs'),
			'--rootDir',
			upstreamRoot,
			'--runInBand',
			'--no-watchman',
			'--json',
			`--outputFile=${report}`,
		],
		{ cwd: repoRoot, encoding: 'utf8' },
	);
	try {
		const output = `${result.stdout}\n${result.stderr}`;
		expect(result.status, output).toBe(0);
		expect(output).toMatch(/Tests:\s+3 skipped, 255 passed, 258 total/);
		expect(output).toMatch(/Snapshots:\s+5 passed, 5 total/);
		const expected = JSON.parse(
			readFileSync(resolve(repoRoot, 'packages/react-select/audit/pristine-runtime.json'), 'utf8'),
		).tests;
		const executed = pristineTestIdentities(JSON.parse(readFileSync(report, 'utf8')), repoRoot);
		expect(executed).toEqual(expected);
	} finally {
		rmSync(report, { force: true });
	}
}, 120_000);
