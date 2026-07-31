#!/usr/bin/env node
import { execFileSync, spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	buildLaneArgv,
	loadManifest,
	verifyLaneEnvironment,
	verifyManifestFiles,
} from './harness-lib.mjs';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const [action = 'validate', ...args] = process.argv.slice(2);
const manifestFlag = args.indexOf('--manifest');
const manifestPath = resolve(
	root,
	manifestFlag === -1 ? 'packages/hook-form/audit/react-parity.json' : args[manifestFlag + 1],
);
const laneFlag = args.indexOf('--lane');
const laneId = laneFlag === -1 ? undefined : args[laneFlag + 1];

for (let index = 0; index < args.length; index += 2) {
	if (!['--manifest', '--lane'].includes(args[index]) || !args[index + 1])
		throw new Error('Invalid or missing flag value');
}

if (!['validate', 'list', 'run'].includes(action)) {
	throw new Error('Usage: harness.mjs <validate|list|run> [--lane ID] [--manifest PATH]');
}

const manifest = await loadManifest(manifestPath);
await verifyManifestFiles(manifest, root);

if (action === 'validate') {
	console.log(`valid: ${manifestPath}`);
} else if (action === 'list') {
	for (const lane of manifest.lanes) {
		const availability = lane.available === false ? 'unavailable' : 'available';
		console.log(
			`${lane.id}\t${lane.type}\t${lane.oracle}\t${availability}\trecorded-unverified; cannot establish pristine parity`,
		);
	}
} else {
	const selected = laneId ? manifest.lanes.filter((lane) => lane.id === laneId) : manifest.lanes;
	if (selected.length === 0) throw new Error(`Unknown lane: ${laneId}`);
	const pnpmVersion = execFileSync('pnpm', ['--version'], { encoding: 'utf8' });
	for (const lane of selected) {
		await verifyLaneEnvironment(manifest, lane, root, pnpmVersion);
		const [command, ...commandArgs] = buildLaneArgv(lane);
		console.log(`running ${lane.id}: ${JSON.stringify([command, ...commandArgs])}`);
		const exitCode = await new Promise((resolveExit, reject) => {
			const child = spawn(command, commandArgs, { cwd: root, shell: false, stdio: 'inherit' });
			child.on('error', reject);
			child.on('exit', (code, signal) => resolveExit(code ?? (signal ? 1 : 0)));
		});
		if (exitCode !== 0) process.exit(exitCode);
	}
}
