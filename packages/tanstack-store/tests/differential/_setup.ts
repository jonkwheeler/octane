/**
 * Precompile the store fixtures through @tsrx/react, rewriting the Octane
 * binding import to real @tanstack/react-store. The shared differential rig
 * then mounts both outputs and compares their rendered behavior step by step.
 */
import { compile as compileToReact } from '@tsrx/react';
import { transformSync } from 'esbuild';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileFixture } from './fixture-compiler';

const fixtureDirectory = join(dirname(fileURLToPath(import.meta.url)), '../_fixtures');
const cacheDirectory = join(dirname(fileURLToPath(import.meta.url)), '.react-cache');

function findFixtures(directory: string): string[] {
	return readdirSync(directory).flatMap((name) => {
		const path = join(directory, name);
		return statSync(path).isDirectory() ? findFixtures(path) : path.endsWith('.tsrx') ? [path] : [];
	});
}

export async function setup(): Promise<void> {
	if (!existsSync(cacheDirectory)) mkdirSync(cacheDirectory, { recursive: true });
	for (const fixture of findFixtures(fixtureDirectory)) {
		compileFixture(fixture, cacheDirectory, {
			readFile: readFileSync,
			compile: compileToReact,
			transform: transformSync,
			writeFile: writeFileSync,
		});
	}
}

export async function teardown(): Promise<void> {}
