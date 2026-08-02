import { compile as compileToReact } from '@tsrx/react';
import { transformSync } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, rmSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, '../_fixtures');
const cache = join(here, '.react-cache');

function hashString(value: string): string {
	let hash = 5381;
	for (let index = 0; index < value.length; index++)
		hash = ((hash << 5) + hash + value.charCodeAt(index)) | 0;
	return Math.abs(hash).toString(36);
}

function walk(directory: string): string[] {
	return readdirSync(directory).flatMap((name) => {
		const path = join(directory, name);
		return statSync(path).isDirectory() ? walk(path) : path.endsWith('.tsrx') ? [path] : [];
	});
}

export async function setup(): Promise<void> {
	rmSync(cache, { recursive: true, force: true });
	mkdirSync(cache, { recursive: true });
	for (const path of walk(fixtures)) {
		const compiled = compileToReact(readFileSync(path, 'utf8'), path);
		if (compiled.errors?.length)
			throw new Error(`React fixture compilation failed: ${JSON.stringify(compiled.errors)}`);
		const output = transformSync(compiled.code, {
			loader: 'tsx',
			jsx: 'automatic',
			jsxImportSource: 'react',
			target: 'esnext',
			format: 'esm',
			sourcefile: path,
		}).code.replace(/from\s+["']@octanejs\/rxjs["']/g, 'from "@react-rxjs/core"');
		writeFileSync(join(cache, `${basename(path, '.tsrx')}-${hashString(path)}.js`), output);
	}
}

export async function teardown(): Promise<void> {}
