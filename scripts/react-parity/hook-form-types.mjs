#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTypeScriptCompilerArgv } from './harness-lib.mjs';
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
for (const [compiler, project] of [
	['tsc', 'packages/hook-form/upstream/src/__typetest__/tsconfig.json'],
	['tsgo', 'packages/hook-form/typetests/tsconfig.json'],
]) {
	const [command, ...args] = buildTypeScriptCompilerArgv(compiler, project);
	execFileSync(command, args, { cwd: root, stdio: 'inherit' });
}
console.log(
	`react-hook-form type parity verified (${result.files} files, ${result.assertions} assertion groups, pristine tsc + adapted tsgo).`,
);
