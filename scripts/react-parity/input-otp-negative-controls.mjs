#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateManifest } from './harness-lib.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const original = JSON.parse(
	await readFile(path.join(repo, 'packages/input-otp/audit/react-parity.json'), 'utf8'),
);

for (const mutate of [
	(copy) => {
		copy.provenance.integrity = 'sha256:deadbeef';
	},
	(copy) => {
		copy.lanes[0].files[0].sha256 = '0'.repeat(63);
	},
	(copy) => {
		copy.provenance.verification = 'verified-without-running';
	},
]) {
	const copy = structuredClone(original);
	mutate(copy);
	assert.throws(() => validateManifest(copy));
}

console.log(
	'input-otp parity negative controls rejected malformed integrity, evidence hashes, and verification state.',
);
