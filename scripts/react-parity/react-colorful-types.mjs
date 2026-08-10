#!/usr/bin/env node

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderTypeInventories, verifyReactColorfulTypes } from './react-colorful-types-lib.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const write = args.includes('--write');

if (write) {
	const { config, inventory } = renderTypeInventories(REPO);
	for (const side of ['upstream', 'adapted']) {
		writeFileSync(
			path.join(REPO, config.inventories[side]),
			`${JSON.stringify(inventory[side], null, '\t')}\n`,
		);
	}
	console.log(
		`Wrote react-colorful type inventories (${inventory.upstream.length} files, ${inventory.upstream.reduce(
			function sum(n, file) {
				return n + file.assertionGroups.length;
			},
			0,
		)} assertion groups).`,
	);
	process.exit(0);
}

const result = verifyReactColorfulTypes(REPO);
console.log(
	`react-colorful type parity ok (${result.files} files, ${result.assertions} assertion groups).`,
);
