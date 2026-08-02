import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const upstreamRoot = join(packageRoot, 'upstream');
const sumsFile = join(upstreamRoot, 'SHA256SUMS');

const expected = new Map(
	readFileSync(sumsFile, 'utf8')
		.trim()
		.split('\n')
		.map((line) => {
			const [hash, path] = line.split(/\s{2}/u);
			return [path, hash];
		}),
);

const walk = (directory) =>
	readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = join(directory, entry.name);
		return entry.isDirectory() ? walk(path) : [path];
	});

const actualFiles = walk(upstreamRoot)
	.map((path) => relative(upstreamRoot, path))
	.filter((path) => path !== 'SHA256SUMS')
	.sort();
const expectedFiles = [...expected.keys()].sort();

if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
	throw new Error('Vendored LiveStore file inventory differs from upstream/SHA256SUMS');
}

for (const path of actualFiles) {
	const bytes = readFileSync(join(upstreamRoot, path));
	const hash = createHash('sha256').update(bytes).digest('hex');
	if (hash !== expected.get(path)) throw new Error(`Vendored byte drift: ${path}`);
}

for (const required of [
	'src/useClientDocument.test.tsx',
	'src/useQuery.test.tsx',
	'src/useRcResource.test.tsx',
	'src/useStore.test.tsx',
	'src/__snapshots__/useClientDocument.test.tsx.snap',
	'src/__snapshots__/useQuery.test.tsx.snap',
]) {
	if (!existsSync(join(upstreamRoot, required)))
		throw new Error(`Missing upstream test artifact: ${required}`);
}

console.log(`LiveStore upstream evidence is current (${actualFiles.length} byte-exact files).`);
