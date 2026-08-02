#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { compareTestIdentities, toPortablePath } from './harness-lib.mjs';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const lanes = [
	{
		project: 'react-markdown-pristine',
		destination: 'packages/react-markdown/audit/pristine-runtime.json',
		roots: ['packages/react-markdown/tests/pristine'],
		include: (file) => file.startsWith('packages/react-markdown/tests/pristine/'),
	},
	{
		project: 'react-markdown',
		destination: 'packages/react-markdown/audit/adapted-runtime.json',
		roots: ['packages/react-markdown/tests'],
		include: (file) =>
			file.startsWith('packages/react-markdown/tests/') &&
			!file.startsWith('packages/react-markdown/tests/pristine/'),
	},
];

for (const lane of lanes) {
	const output = execFileSync(
		process.execPath,
		['node_modules/vitest/vitest.mjs', 'list', '--project', lane.project, '--json'],
		{ cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
	);
	const tests = JSON.parse(output)
		.map((test) => ({
			file: toPortablePath(relative(root, test.file)),
			fullName: test.name.replaceAll(' > ', ' '),
		}))
		.filter((test) => lane.include(test.file))
		.map((test) => ({
			id: `runtime:${createHash('sha256')
				.update(`${test.file}\0${test.fullName}`)
				.digest('hex')
				.slice(0, 16)}`,
			...test,
		}))
		.sort(compareTestIdentities);
	const inventory = {
		schemaVersion: 1,
		project: lane.project,
		roots: lane.roots,
		files: [...new Set(tests.map((test) => test.file))],
		tests,
	};
	const destination = resolve(root, lane.destination);
	writeFileSync(
		destination,
		await format(JSON.stringify(inventory), {
			...(await resolveConfig(destination)),
			filepath: destination,
		}),
	);
	console.log(`${lane.destination}: ${tests.length} tests`);
}
