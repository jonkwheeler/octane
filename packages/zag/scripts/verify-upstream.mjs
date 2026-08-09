import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const upstreamRoot = join(packageRoot, 'upstream');
const sumsFile = join(upstreamRoot, 'SHA256SUMS');

function walk(directory) {
	return readdirSync(directory, { withFileTypes: true }).flatMap(function flatten(entry) {
		const path = join(directory, entry.name);
		return entry.isDirectory() ? walk(path) : [path];
	});
}

/**
 * Verifies every vendored Zag React adapter byte against upstream/SHA256SUMS
 * and confirms the required runtime test artifacts are present.
 */
export function verifyZagUpstream(root = packageRoot) {
	const upstream = join(root, 'upstream');
	const sums = join(upstream, 'SHA256SUMS');
	const expected = new Map(
		readFileSync(sums, 'utf8')
			.trim()
			.split('\n')
			.map(function parseLine(line) {
				const [hash, path] = line.split(/\s{2}/u);
				return [path, hash];
			}),
	);

	const actualFiles = walk(upstream)
		.map(function toRelative(path) {
			return relative(upstream, path);
		})
		.filter(function keepSource(path) {
			return path !== 'SHA256SUMS';
		})
		.sort();
	const expectedFiles = [...expected.keys()].sort();

	if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
		throw new Error('Vendored Zag file inventory differs from upstream/SHA256SUMS');
	}

	for (const path of actualFiles) {
		const bytes = readFileSync(join(upstream, path));
		const hash = createHash('sha256').update(bytes).digest('hex');
		if (hash !== expected.get(path)) throw new Error(`Vendored byte drift: ${path}`);
	}

	for (const required of [
		'tests/machine.test.ts',
		'tests/nested-states.test.ts',
		'tests/strict-mode.test.tsx',
		'tests/render.ts',
		'src/machine.ts',
		'src/index.ts',
		'vite.config.ts',
		'vitest.setup.ts',
	]) {
		if (!existsSync(join(upstream, required)))
			throw new Error(`Missing upstream test artifact: ${required}`);
	}

	// Negative control: every portable upstream runtime case (excluding
	// StrictMode-only evidence) must have a one-for-one adapted counterpart.
	const adaptedPairs = [
		['tests/machine.test.ts', 'tests/upstream/machine.test.ts'],
		['tests/nested-states.test.ts', 'tests/upstream/nested-states.test.ts'],
	];
	for (const [upstreamFile, adaptedFile] of adaptedPairs) {
		const upstreamTitles = testTitles(readFileSync(join(upstream, upstreamFile), 'utf8'));
		const adaptedPath = join(root, adaptedFile);
		if (!existsSync(adaptedPath))
			throw new Error(`Missing adapted counterpart for ${upstreamFile}: ${adaptedFile}`);
		const adaptedTitles = testTitles(readFileSync(adaptedPath, 'utf8'));
		if (JSON.stringify(upstreamTitles) !== JSON.stringify(adaptedTitles)) {
			throw new Error(
				`Adapted titles drifted from ${upstreamFile}; expected ${upstreamTitles.length} cases, found ${adaptedTitles.length}`,
			);
		}
	}
	if (!existsSync(join(root, 'tests/upstream-original.test.ts'))) {
		throw new Error('Missing pristine wrapper packages/zag/tests/upstream-original.test.ts');
	}

	return { files: actualFiles.length };
}

function testTitles(source) {
	const titles = [];
	for (const match of source.matchAll(/^\s*test\(\s*(['"`])([\s\S]*?)\1/gm)) {
		titles.push(match[2]);
	}
	return titles;
}

const isMain =
	process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
	const result = verifyZagUpstream();
	console.log(`Zag upstream evidence is current (${result.files} byte-exact files).`);
}
