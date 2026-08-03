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
	files.length !== 52 ||
	checksums.size !== files.length ||
	files.some((path) => !checksums.has(path))
)
	throw new Error('vendored TanStack React Pacer file inventory drifted');
for (const path of files) {
	const digest = createHash('sha256')
		.update(readFileSync(resolve(upstreamRoot, path)))
		.digest('hex');
	if (digest !== checksums.get(path)) throw new Error(`vendored upstream bytes drifted: ${path}`);
}

const metadata = JSON.parse(readFileSync(resolve(upstreamRoot, 'package/package.json'), 'utf8'));
if (
	metadata.name !== '@tanstack/react-pacer' ||
	metadata.version !== '0.22.1' ||
	metadata.dependencies['@tanstack/pacer'] !== 'workspace:*' ||
	Object.keys(metadata.exports).length !== 16
)
	throw new Error('upstream package metadata drifted');
const sourceFiles = files.filter((path) => path.startsWith('package/src/'));
const testFiles = files.filter((path) => /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(path));
if (sourceFiles.length !== 43 || testFiles.length !== 0)
	throw new Error('upstream source or runtime suite inventory drifted');

const crosswalk = JSON.parse(
	readFileSync(resolve(packageRoot, 'audit/upstream-crosswalk.json'), 'utf8'),
);
const octaneMetadata = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8'));
const upstreamPaths = Object.keys(metadata.exports).sort();
const declaredPaths = crosswalk.publicEntrypoints.map((entry) => entry.path).sort();
if (JSON.stringify(upstreamPaths) !== JSON.stringify(declaredPaths))
	throw new Error('upstream entrypoint crosswalk drifted');
const expectedOctanePaths = upstreamPaths.filter((path) => path !== './package.json');
if (
	JSON.stringify(Object.keys(octaneMetadata.exports).sort()) !== JSON.stringify(expectedOctanePaths)
)
	throw new Error('Octane entrypoint surface drifted');

console.log(
	'TanStack React Pacer upstream ledger is current (52 files, 43 source files, 16 entrypoints, no runtime test suite).',
);
