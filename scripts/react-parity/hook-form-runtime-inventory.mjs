#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const lanes = [
	['hook-form', 'packages/hook-form/audit/adapted-runtime.json'],
	['hook-form-server', 'packages/hook-form/audit/adapted-runtime-server.json'],
];

for (const [project, destination] of lanes) {
	const output = execFileSync(
		process.execPath,
		['node_modules/vitest/vitest.mjs', 'list', '--project', project, '--staticParse', '--json'],
		{ cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
	);
	const tests = JSON.parse(output)
		.filter((test) => test.file.includes('/packages/hook-form/tests/upstream/'))
		.map((test) => ({
			id: `runtime:${createHash('sha256')
				.update(`${relative(root, test.file)}\0${test.name.replaceAll(' > ', ' ')}`)
				.digest('hex')
				.slice(0, 16)}`,
			file: relative(root, test.file),
			fullName: test.name.replaceAll(' > ', ' '),
		}))
		.sort((a, b) => `${a.file}\0${a.fullName}`.localeCompare(`${b.file}\0${b.fullName}`));
	const inventory = {
		schemaVersion: 1,
		project,
		files: [...new Set(tests.map((test) => test.file))],
		tests,
	};
	const absolute = resolve(root, destination);
	mkdirSync(dirname(absolute), { recursive: true });
	writeFileSync(absolute, `${JSON.stringify(inventory, null, 2)}\n`);
	console.log(`${destination}: ${tests.length} tests`);
}
