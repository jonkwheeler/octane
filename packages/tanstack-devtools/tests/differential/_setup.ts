import { compile as compileToReact } from '@tsrx/react';
import { transformSync } from 'esbuild';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const fixture = join(dirname(fileURLToPath(import.meta.url)), '../_fixtures/devtools-diff.tsrx');
const cacheDirectory = join(dirname(fileURLToPath(import.meta.url)), '.react-cache');

function hashString(value: string): string {
	let hash = 5381;
	for (let index = 0; index < value.length; index++)
		hash = ((hash << 5) + hash + value.charCodeAt(index)) | 0;
	return Math.abs(hash).toString(36);
}

export async function setup(): Promise<void> {
	if (!existsSync(cacheDirectory)) mkdirSync(cacheDirectory, { recursive: true });
	const upstreamAdapter = join(
		dirname(fileURLToPath(import.meta.url)),
		'../../upstream/package/src/devtools.tsx',
	);
	const adapter = transformSync(readFileSync(upstreamAdapter, 'utf8'), {
		loader: 'tsx',
		jsx: 'automatic',
		jsxImportSource: 'react',
		target: 'esnext',
		format: 'esm',
		sourcefile: upstreamAdapter,
	});
	writeFileSync(join(cacheDirectory, 'react-devtools.js'), adapter.code);
	const compiled = compileToReact(readFileSync(fixture, 'utf8'), fixture);
	if (compiled.errors?.length)
		throw new Error(`Unable to compile ${fixture}:\n${compiled.errors.join('\n')}`);
	const transformed = transformSync(compiled.code, {
		loader: 'tsx',
		jsx: 'automatic',
		jsxImportSource: 'react',
		target: 'esnext',
		format: 'esm',
		sourcefile: fixture,
	});
	const rewritten = transformed.code.replace(
		/from\s+["']@octanejs\/tanstack-devtools["']/g,
		'from "@tanstack/react-devtools"',
	);
	const slug = basename(fixture).replace(/\.tsrx$/, '');
	writeFileSync(join(cacheDirectory, `${slug}-${hashString(fixture)}.js`), rewritten);
}

export async function teardown(): Promise<void> {}
