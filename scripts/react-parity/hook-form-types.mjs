#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderTypeInventories, verifyHookFormTypes } from './hook-form-types-lib.mjs';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
if (process.argv.includes('--write')) {
	const { config, inventory } = renderTypeInventories(root);
	for (const side of ['upstream', 'adapted']) {
		const destination = resolve(root, config.inventories[side]);
		mkdirSync(dirname(destination), { recursive: true });
		writeFileSync(destination, `${JSON.stringify(inventory[side], null, 2)}\n`);
	}
}
const result = verifyHookFormTypes(root);
execFileSync(
	resolve(root, 'node_modules/.bin/tsc'),
	['--noEmit', '-p', 'packages/hook-form/upstream/src/__typetest__/tsconfig.json'],
	{ cwd: root, stdio: 'inherit' },
);
execFileSync(
	resolve(root, 'node_modules/.bin/tsgo'),
	['--noEmit', '-p', 'packages/hook-form/typetests/tsconfig.json'],
	{ cwd: root, stdio: 'inherit' },
);
console.log(
	`react-hook-form type parity verified (${result.files} files, ${result.assertions} assertion groups, pristine tsc + adapted tsgo).`,
);
