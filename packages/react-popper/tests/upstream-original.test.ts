import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, parse, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { expect, it } from 'vitest';

function findRepoRoot(start: string): string {
	let directory = resolve(start);
	const filesystemRoot = parse(directory).root;
	while (directory !== filesystemRoot) {
		if (
			existsSync(resolve(directory, 'pnpm-workspace.yaml')) &&
			existsSync(resolve(directory, 'packages/react-popper/package.json'))
		) {
			return directory;
		}
		directory = dirname(directory);
	}
	throw new Error(`Could not locate the Octane repository above ${start}`);
}

const repoRoot = findRepoRoot(process.cwd());
const upstreamRoot = resolve(repoRoot, 'packages/react-popper/upstream/tag');
const jestBin = createRequire(resolve(repoRoot, 'packages/react-popper/package.json')).resolve(
	'jest/bin/jest',
);

type Identity = { file: string; fullName: string; status?: string };

// @parity-case pristine:react-popper-original-suite
it('runs all 18 pinned react-popper tests unchanged', function runsPinnedReactPopperSuite() {
	const report = join(tmpdir(), `octane-react-popper-pristine-${process.pid}.json`);
	const result = spawnSync(
		process.execPath,
		[
			jestBin,
			'--config',
			resolve(repoRoot, 'packages/react-popper/tests/upstream-jest.config.cjs'),
			'--rootDir',
			upstreamRoot,
			'--runInBand',
			'--no-watchman',
			'--json',
			`--outputFile=${report}`,
		],
		{
			cwd: repoRoot,
			encoding: 'utf8',
			env: {
				...process.env,
				BABEL_ENV: 'test',
				NODE_ENV: 'test',
			},
		},
	);
	const output = `${result.stdout}\n${result.stderr}`;
	expect(result.status, output).toBe(0);
	expect(output).toMatch(/Tests:\s+18 passed, 18 total/);
	const expected = JSON.parse(
		readFileSync(resolve(repoRoot, 'packages/react-popper/audit/pristine-runtime.json'), 'utf8'),
	).tests as Identity[];
	const reportJson = JSON.parse(readFileSync(report, 'utf8'));
	const executed = reportJson.testResults
		.flatMap(function suiteIdentities(suite: {
			name: string;
			assertionResults: Array<{ fullName: string; status: string }>;
		}) {
			return suite.assertionResults.map(function identity(test: {
				fullName: string;
				status: string;
			}) {
				return {
					file: suite.name
						.replace(upstreamRoot + '/', '')
						.replace(upstreamRoot + '\\', '')
						.replaceAll('\\', '/'),
					fullName: test.fullName,
					status: test.status,
				};
			});
		})
		.filter(function keepPassed(test: Identity) {
			return test.status === 'passed';
		})
		.map(function stripStatus(test: Identity) {
			return { file: test.file, fullName: test.fullName };
		})
		.sort(function compare(left: Identity, right: Identity) {
			const leftKey = `${left.file}\0${left.fullName}`;
			const rightKey = `${right.file}\0${right.fullName}`;
			return leftKey.localeCompare(rightKey);
		});
	expect(executed).toEqual(
		expected.map(function expectedIdentity(test: Identity) {
			return { file: test.file, fullName: test.fullName };
		}),
	);
}, 120_000);
