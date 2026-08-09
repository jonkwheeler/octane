import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, parse, resolve } from 'node:path';
import { expect, it } from 'vitest';

import { pristineTestIdentities } from '../../../scripts/react-parity/waypoint-pristine-runtime.mjs';
import { verifyWaypointUpstream } from '../scripts/verify-upstream.mjs';

function findRepoRoot(start: string): string {
	let directory = resolve(start);
	const filesystemRoot = parse(directory).root;
	while (directory !== filesystemRoot) {
		if (
			existsSync(resolve(directory, 'pnpm-workspace.yaml')) &&
			existsSync(resolve(directory, 'packages/waypoint/package.json'))
		) {
			return directory;
		}
		directory = dirname(directory);
	}
	throw new Error(`Could not locate the Octane repository above ${start}`);
}

const repoRoot = findRepoRoot(process.cwd());
const upstreamRoot = resolve(repoRoot, 'packages/waypoint/upstream');
const jestBin = createRequire(resolve(repoRoot, 'packages/waypoint/package.json')).resolve(
	'jest/bin/jest',
);

// @parity-case pristine:react-waypoint-original-node-suite
it('runs the pinned react-waypoint 10.3.0 node suite unchanged', function runsPinnedWaypointSuite() {
	verifyWaypointUpstream(resolve(repoRoot, 'packages/waypoint'));
	const report = join(tmpdir(), `octane-waypoint-pristine-${process.pid}.json`);
	const result = spawnSync(
		process.execPath,
		[
			jestBin,
			'--config',
			resolve(repoRoot, 'packages/waypoint/tests/upstream-jest.config.cjs'),
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
		readFileSync(resolve(repoRoot, 'packages/waypoint/audit/pristine-runtime.json'), 'utf8'),
	).tests;
	const executed = pristineTestIdentities(JSON.parse(readFileSync(report, 'utf8')), repoRoot);
	expect(executed).toEqual(expected);
}, 60_000);
