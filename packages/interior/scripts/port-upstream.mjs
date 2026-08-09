#!/usr/bin/env node
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DEST = join(__dirname, '../src/components');
const upstreamDir = process.argv[2];

if (!upstreamDir || !existsSync(join(upstreamDir, 'components/interior'))) {
	console.error('Usage: node port-upstream.mjs <path-to-interior-repo-root>');
	process.exit(1);
}

const SRC = join(upstreamDir, 'components/interior');

function transformSource(text) {
	let out = text.replace(/\r\n/g, '\n');
	out = out.replace(/^["']use client["'];\s*\n/m, '');
	out = out.replace(/from "react"/g, "from 'octane'");
	out = out.replace(/from 'react'/g, "from 'octane'");
	out = out.replace(/from "motion\/react"/g, "from '@octanejs/motion'");
	out = out.replace(/from 'motion\/react'/g, "from '@octanejs/motion'");
	out = out.replace(/(\s)className=/g, '$1class=');
	// Custom hooks stay file-local so Octane can slot internal hook calls in .tsrx.
	out = out.replace(/export function (use[A-Za-z0-9_]+)/g, 'function $1');
	return out;
}

function walk(dir) {
	const out = [];
	for (const name of readdirSync(dir)) {
		const full = join(dir, name);
		if (statSync(full).isDirectory()) out.push(...walk(full));
		else if (full.endsWith('.tsx')) out.push(full);
	}
	return out;
}

const copyButtonPath = join(DEST, 'copy-button.tsrx');
const copyButtonBackup = existsSync(copyButtonPath) ? readFileSync(copyButtonPath, 'utf8') : null;
if (existsSync(DEST)) rmSync(DEST, { recursive: true });
mkdirSync(DEST, { recursive: true });
const hooksDir = join(__dirname, '../src/hooks');
const hooksBackup = existsSync(hooksDir)
	? readdirSync(hooksDir).reduce(function backup(acc, name) {
			const full = join(hooksDir, name);
			if (statSync(full).isFile()) acc[name] = readFileSync(full, 'utf8');
			return acc;
		}, {})
	: null;
if (existsSync(hooksDir)) rmSync(hooksDir, { recursive: true });

const exports = [];
for (const file of walk(SRC)) {
	const name = basename(file).replace(/\.tsx$/, '');
	if (name === 'copy-button') continue;
	const destFile = join(DEST, `${name}.tsrx`);
	writeFileSync(destFile, transformSource(readFileSync(file, 'utf8')));
	exports.push(name);
	console.log('ported', name);
}
if (copyButtonBackup) {
	writeFileSync(copyButtonPath, copyButtonBackup);
	exports.push('copy-button');
}

const indexLines = [
	'// @octanejs/interior — interior.dev copy-paste micro-interactions for Octane.',
	'// Upstream: https://github.com/ddoemonn/interior (MIT)',
	'// Headless hooks remain file-local; only styled components are exported.',
	'',
];
for (const name of exports.sort()) {
	indexLines.push(`export * from './components/${name}.tsrx';`);
}
writeFileSync(join(__dirname, '../src/index.ts'), `${indexLines.join('\n')}\n`);

if (hooksBackup) {
	mkdirSync(hooksDir, { recursive: true });
	for (const [name, content] of Object.entries(hooksBackup)) {
		writeFileSync(join(hooksDir, name), content);
	}
}

console.log(`ported ${exports.length} components`);
