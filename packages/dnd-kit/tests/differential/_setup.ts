/**
 * Precompile the shared `.tsrx` fixtures through @tsrx/react and rewrite the
 * Octane adapter imports to the upstream @dnd-kit/react package. The normal
 * differential rig then mounts both products and compares every DOM step.
 *
 * Fail closed: clear the cache before writing, and throw on React compilation
 * or transform failures so incremental runs never import stale oracle JS.
 */
import { compile as compileToReact } from '@tsrx/react';
import { transformSync } from 'esbuild';
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

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const fixtureDirectory = join(currentDirectory, '../_fixtures');
const cacheDirectory = join(currentDirectory, '.react-cache');

function hashString(value: string): string {
	let hash = 5381;
	for (let index = 0; index < value.length; index++) {
		hash = ((hash << 5) + hash + value.charCodeAt(index)) | 0;
	}
	return Math.abs(hash).toString(36);
}

function compileOne(sourcePath: string): void {
	const source = readFileSync(sourcePath, 'utf8');
	let compiled;
	try {
		compiled = compileToReact(source, sourcePath);
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		throw new Error(`React fixture compilation failed for ${sourcePath}: ${detail}`);
	}
	if (compiled.errors?.length) {
		throw new Error(
			`React fixture compilation failed for ${sourcePath}: ${JSON.stringify(compiled.errors)}`,
		);
	}

	let transformed;
	try {
		transformed = transformSync(compiled.code, {
			loader: 'tsx',
			jsx: 'automatic',
			jsxImportSource: 'react',
			target: 'esnext',
			format: 'esm',
			sourcefile: sourcePath,
		});
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		throw new Error(`React fixture transform failed for ${sourcePath}: ${detail}`);
	}

	const rewritten = transformed.code
		.replace(/from\s+["']@octanejs\/dnd-kit(\/[^"']*)?["']/g, function (_match, subpath) {
			return `from "@dnd-kit/react${subpath || ''}"`;
		})
		.replace(/from\s+["']octane["']/g, 'from "react"');
	const slug = basename(sourcePath).replace(/\.tsrx$/, '');
	writeFileSync(join(cacheDirectory, `${slug}-${hashString(sourcePath)}.js`), rewritten);
}

function walk(directory: string): string[] {
	const files: string[] = [];
	for (const name of readdirSync(directory)) {
		const path = join(directory, name);
		if (statSync(path).isDirectory()) files.push(...walk(path));
		else if (path.endsWith('.tsrx')) files.push(path);
	}
	return files;
}

export async function setup(): Promise<void> {
	rmSync(cacheDirectory, { recursive: true, force: true });
	mkdirSync(cacheDirectory, { recursive: true });
	if (!existsSync(fixtureDirectory)) return;
	for (const file of walk(fixtureDirectory)) compileOne(file);
}

export async function teardown(): Promise<void> {}
