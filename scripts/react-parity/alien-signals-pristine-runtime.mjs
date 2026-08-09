#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compareTestIdentities, toPortablePath } from './harness-lib.mjs';
import { verifyAlienSignalsUpstream } from '../../packages/alien-signals/scripts/verify-upstream.mjs';

const packageRoot = resolve(
	dirname(fileURLToPath(import.meta.url)),
	'../../packages/alien-signals',
);
const upstreamRoot = join(packageRoot, 'upstream');
const require = createRequire(import.meta.url);

function resolveBunBinary() {
	try {
		const packageJsonPath = require.resolve('bun/package.json', { paths: [packageRoot] });
		const bunPackageRoot = dirname(packageJsonPath);
		const candidates = [
			join(bunPackageRoot, 'bin', 'bun'),
			join(bunPackageRoot, 'bin', 'bun.exe'),
			join(packageRoot, 'node_modules', '.bin', 'bun'),
		];
		for (const candidate of candidates) {
			if (existsSync(candidate)) return candidate;
		}
	} catch {
		// Fall through to PATH lookup.
	}
	return 'bun';
}

function parseBunIdentities(stdout, repoRoot) {
	const identities = [];
	const portableFile = 'packages/alien-signals/upstream/src/index.test.ts';
	for (const line of stdout.split('\n')) {
		const match = /^\(pass\)\s+(.+?)\s*(?:\[[^\]]+\])?\s*$/.exec(line.trim());
		if (match === null) continue;
		identities.push({
			file: portableFile,
			fullName: match[1].replaceAll(' > ', ' '),
			status: 'passed',
		});
	}
	void repoRoot;
	return identities.sort(compareTestIdentities);
}

export function inventoryFromIdentities(identities, project = 'alien-signals-pristine') {
	const idOccurrences = new Map();
	const tests = identities
		.filter(function keepPassed(test) {
			return test.status === 'passed';
		})
		.map(function toInventoryEntry(test) {
			const baseId = `runtime:${createHash('sha256')
				.update(`${test.file}\0${test.fullName}`)
				.digest('hex')
				.slice(0, 16)}`;
			const occurrence = idOccurrences.get(baseId) ?? 0;
			idOccurrences.set(baseId, occurrence + 1);
			return {
				id: occurrence === 0 ? baseId : `${baseId}:${occurrence + 1}`,
				file: test.file,
				fullName: test.fullName,
			};
		})
		.sort(compareTestIdentities);
	return {
		schemaVersion: 1,
		project,
		roots: ['packages/alien-signals/upstream'],
		files: [
			...new Set(
				tests.map(function fileOf(test) {
					return test.file;
				}),
			),
		].sort(),
		tests,
	};
}

export function runPristineUpstreamSuite({ repoRoot = resolve(packageRoot, '../..') } = {}) {
	verifyAlienSignalsUpstream(packageRoot);
	const runRoot = mkdtempSync(join(tmpdir(), 'octane-alien-signals-pristine-'));
	try {
		cpSync(join(upstreamRoot, 'src'), join(runRoot, 'src'), { recursive: true });
		writeFileSync(
			join(runRoot, 'package.json'),
			`${JSON.stringify(
				{
					name: 'alien-signals-pristine-run',
					private: true,
					type: 'module',
				},
				null,
				'\t',
			)}\n`,
		);
		symlinkSync(join(packageRoot, 'node_modules'), join(runRoot, 'node_modules'), 'dir');
		const bunBinary = resolveBunBinary();
		const result = spawnSync(bunBinary, ['test', 'src/index.test.ts'], {
			cwd: runRoot,
			encoding: 'utf8',
		});
		const stdout = result.stdout ?? '';
		const stderr = result.stderr ?? '';
		// bun test prints the pass/fail ledger on stderr.
		const identities = parseBunIdentities(`${stdout}\n${stderr}`, repoRoot);
		return {
			status: result.status ?? 1,
			stdout,
			stderr,
			identities,
			portableRoots: [toPortablePath(relative(repoRoot, upstreamRoot))],
		};
	} finally {
		rmSync(runRoot, { recursive: true, force: true });
	}
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const result = runPristineUpstreamSuite();
	if (result.stdout) process.stdout.write(result.stdout);
	if (result.stderr) process.stderr.write(result.stderr);
	process.exitCode = result.status === 0 ? 0 : 1;
}
