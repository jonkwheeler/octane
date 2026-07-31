#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	renderHookFormUpstreamInventory,
	verifyHookFormUpstream,
} from './hook-form-upstream-lib.mjs';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
if (process.argv.includes('--write-inventory')) {
	writeFileSync(
		resolve(root, 'packages/hook-form/upstream/SHA256SUMS'),
		renderHookFormUpstreamInventory(root),
	);
}

const result = verifyHookFormUpstream(root);
console.log(
	`react-hook-form upstream evidence is current (${result.artifacts} artifacts, ${result.upstreamCases} upstream registrations, ${result.portedCases} adapted registrations).`,
);
