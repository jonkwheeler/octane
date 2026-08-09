#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compareTestIdentities, toPortablePath } from './harness-lib.mjs';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const upstreamRoot = resolve(root, 'packages/react-transition-group/upstream');
const report = join(tmpdir(), `octane-react-transition-group-pristine-${process.pid}.json`);
const destination = resolve(root, 'packages/react-transition-group/audit/pristine-runtime.json');
const jestBin = createRequire(
	resolve(root, 'packages/react-transition-group/package.json'),
).resolve('jest/bin/jest');

export function pristineTestIdentities(result, repoRoot = root) {
	return result.testResults
		.flatMap(function collectSuite(suite) {
			return suite.assertionResults.map(function collectTest(test) {
				return {
					file: toPortablePath(
						relative(resolve(repoRoot, 'packages/react-transition-group/upstream'), suite.name),
					),
					fullName: test.fullName,
					status: test.status,
				};
			});
		})
		.sort(compareTestIdentities);
}

if (process.argv.includes('--write')) {
	const result = spawnSync(
		process.execPath,
		[
			jestBin,
			'--config',
			resolve(root, 'packages/react-transition-group/tests/upstream-jest.config.cjs'),
			'--rootDir',
			upstreamRoot,
			'--runInBand',
			'--no-watchman',
			'--json',
			`--outputFile=${report}`,
		],
		{ cwd: root, encoding: 'utf8' },
	);
	try {
		if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`);
		const reportJson = JSON.parse(readFileSync(report, 'utf8'));
		const tests = pristineTestIdentities(reportJson);
		writeFileSync(
			destination,
			`${JSON.stringify(
				{
					schemaVersion: 1,
					root: 'packages/react-transition-group/upstream',
					tests,
					snapshots: reportJson.snapshot?.total ?? 0,
				},
				null,
				2,
			)}\n`,
		);
		console.log(
			`packages/react-transition-group/audit/pristine-runtime.json: ${tests.length} tests`,
		);
	} finally {
		rmSync(report, { force: true });
	}
}
