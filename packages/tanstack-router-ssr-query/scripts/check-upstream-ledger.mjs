import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const upstreamRoot = resolve(packageRoot, 'upstream');

function walk(directory) {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = resolve(directory, entry.name);
		return entry.isDirectory()
			? walk(path)
			: entry.isFile() && entry.name !== 'SHA256SUMS'
				? [path]
				: [];
	});
}

const checksums = new Map(
	readFileSync(resolve(upstreamRoot, 'SHA256SUMS'), 'utf8')
		.trim()
		.split('\n')
		.map((line) => {
			const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
			if (!match) throw new Error(`invalid checksum line: ${line}`);
			return [match[2], match[1]];
		}),
);
const files = walk(upstreamRoot)
	.map((path) => relative(upstreamRoot, path).split(sep).join('/'))
	.sort();
if (
	files.length !== 9 ||
	checksums.size !== files.length ||
	files.some((path) => !checksums.has(path))
)
	throw new Error('vendored TanStack React Router SSR Query file inventory drifted');
for (const path of files) {
	const digest = createHash('sha256')
		.update(readFileSync(resolve(upstreamRoot, path)))
		.digest('hex');
	if (digest !== checksums.get(path)) throw new Error(`vendored upstream bytes drifted: ${path}`);
}

const metadata = JSON.parse(readFileSync(resolve(upstreamRoot, 'package/package.json'), 'utf8'));
if (
	metadata.name !== '@tanstack/react-router-ssr-query' ||
	metadata.version !== '1.167.1' ||
	metadata.dependencies['@tanstack/router-ssr-query-core'] !== 'workspace:*' ||
	Object.keys(metadata.exports).length !== 2
)
	throw new Error('upstream package metadata drifted');
const sourceFiles = files.filter((path) => path.startsWith('package/src/'));
const testFiles = files.filter((path) => /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(path));
if (sourceFiles.length !== 1 || testFiles.length !== 0)
	throw new Error('upstream source or runtime suite inventory drifted');

const crosswalk = JSON.parse(
	readFileSync(resolve(packageRoot, 'audit/upstream-crosswalk.json'), 'utf8'),
);
const upstreamPaths = Object.keys(metadata.exports).sort();
const declaredPaths = crosswalk.publicEntrypoints.map((entry) => entry.path).sort();
if (JSON.stringify(upstreamPaths) !== JSON.stringify(declaredPaths))
	throw new Error('upstream entrypoint crosswalk drifted');

console.log(
	'TanStack React Router SSR Query upstream ledger is current (9 files, 1 source file, 2 entrypoints, no runtime test suite).',
);
