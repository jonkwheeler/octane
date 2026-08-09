/**
 * Vitest globalSetup for `@octanejs/interior` differential tests.
 *
 * interior.dev has no npm package — the React oracle is the pinned upstream
 * copy-paste source vendored under `tests/differential/upstream/`. Fixtures are
 * compiled through `@tsrx/react` + esbuild with `@octanejs/interior` rewritten
 * to that oracle and `octane` → `react`.
 */
import { compile as compileToReact } from '@tsrx/react';
import { transformSync as esbuildTransformSync } from 'esbuild';
import {
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	rmSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURE_DIR = join(__dirname, '_fixtures');
const UPSTREAM_DIR = join(__dirname, 'upstream');
const CACHE_DIR = join(__dirname, '.react-cache');

function hashString(value: string): string {
	let hash = 5381;
	for (let index = 0; index < value.length; index++) {
		hash = ((hash << 5) + hash + value.charCodeAt(index)) | 0;
	}
	return Math.abs(hash).toString(36);
}

function compileUpstream(name: string): void {
	const sourcePath = join(UPSTREAM_DIR, `${name}.tsx`);
	const source = readFileSync(sourcePath, 'utf8');
	const transformed = esbuildTransformSync(source, {
		loader: 'tsx',
		jsx: 'automatic',
		jsxImportSource: 'react',
		target: 'esnext',
		format: 'esm',
		sourcefile: sourcePath,
	});
	writeFileSync(join(CACHE_DIR, `upstream-${name}.js`), transformed.code);
}

function compileOne(sourcePath: string): void {
	const source = readFileSync(sourcePath, 'utf8');
	const compiled = compileToReact(source, sourcePath);
	if (compiled.errors && compiled.errors.length > 0) {
		throw new Error(
			`React fixture compilation failed for ${sourcePath}: ${JSON.stringify(compiled.errors)}`,
		);
	}
	const transformed = esbuildTransformSync(compiled.code, {
		loader: 'tsx',
		jsx: 'automatic',
		jsxImportSource: 'react',
		target: 'esnext',
		format: 'esm',
		sourcefile: sourcePath,
	});
	const rewritten = transformed.code
		.replace(/from\s+["']@octanejs\/interior(?:\/[^"']*)?["']/g, 'from "./upstream-copy-button.js"')
		.replace(/from\s+["']octane["']/g, 'from "react"');
	const slug = basename(sourcePath).replace(/\.tsrx$/, '');
	writeFileSync(join(CACHE_DIR, `${slug}-${hashString(sourcePath)}.js`), rewritten);
}

function walk(directory: string): string[] {
	const files: string[] = [];
	for (const name of readdirSync(directory)) {
		const fullPath = join(directory, name);
		if (statSync(fullPath).isDirectory()) files.push(...walk(fullPath));
		else if (fullPath.endsWith('.tsrx')) files.push(fullPath);
	}
	return files;
}

export async function setup(): Promise<void> {
	rmSync(CACHE_DIR, { recursive: true, force: true });
	mkdirSync(CACHE_DIR, { recursive: true });
	compileUpstream('copy-button');
	if (!existsSync(FIXTURE_DIR)) return;
	for (const sourcePath of walk(FIXTURE_DIR)) compileOne(sourcePath);
}

export async function teardown(): Promise<void> {}
