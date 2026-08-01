#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const upstreamRoot = resolve(root, 'packages/hook-form/upstream');
const report = join(tmpdir(), `octane-hook-form-pristine-${process.pid}.json`);
const destination = resolve(root, 'packages/hook-form/audit/pristine-runtime.json');
const jestBin = createRequire(resolve(root, 'packages/hook-form/package.json')).resolve(
	'jest/bin/jest',
);

export function pristineTestIdentities(result, repoRoot = root) {
	return result.testResults
		.flatMap((suite) =>
			suite.assertionResults.map((test) => ({
				file: suite.name.replace(`${repoRoot}/packages/hook-form/upstream/`, ''),
				fullName: test.fullName,
				status: test.status,
			})),
		)
		.sort((a, b) => `${a.file}\0${a.fullName}`.localeCompare(`${b.file}\0${b.fullName}`));
}

if (process.argv.includes('--write')) {
	const result = spawnSync(
		process.execPath,
		[
			jestBin,
			'--config',
			resolve(root, 'packages/hook-form/tests/upstream-jest.config.cjs'),
			'--rootDir',
			upstreamRoot,
			'--runInBand',
			'--no-watchman',
			'--json',
			`--outputFile=${report}`,
		],
		{ cwd: root, encoding: 'utf8' },
	);
	if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`);
	const tests = pristineTestIdentities(JSON.parse(readFileSync(report, 'utf8')));
	writeFileSync(destination, `${JSON.stringify({ schemaVersion: 1, tests }, null, 2)}\n`);
	console.log(`packages/hook-form/audit/pristine-runtime.json: ${tests.length} tests`);
}
