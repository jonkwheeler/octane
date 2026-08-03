import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const upstreamRoot = resolve(packageRoot, 'upstream');
const repositoryRoot = resolve(upstreamRoot, 'repository');

function walk(directory) {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = resolve(directory, entry.name);
		return entry.isDirectory() ? walk(path) : entry.isFile() ? [path] : [];
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
const files = walk(repositoryRoot)
	.map((path) => relative(upstreamRoot, path).split(sep).join('/'))
	.sort();
if (
	files.length !== 452 ||
	checksums.size !== files.length ||
	files.some((path) => !checksums.has(path))
)
	throw new Error('vendored Radix file inventory drifted');
for (const path of files) {
	const digest = createHash('sha256')
		.update(readFileSync(resolve(upstreamRoot, path)))
		.digest('hex');
	if (digest !== checksums.get(path)) throw new Error(`vendored Radix bytes drifted: ${path}`);
}

const packageFiles = files.filter((path) => path.endsWith('/package.json'));
const packages = packageFiles.map((path) =>
	JSON.parse(readFileSync(resolve(upstreamRoot, path), 'utf8')),
);
const unified = packages.find((metadata) => metadata.name === 'radix-ui');
if (
	packages.length !== 61 ||
	unified?.version !== '1.6.4' ||
	Object.keys(unified.dependencies ?? {}).length !== 55
)
	throw new Error('vendored Radix transitive package graph drifted');

const sourceFiles = files.filter((path) => /\/src\//.test(path));
const testFiles = files.filter((path) => /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(path));
if (sourceFiles.length !== 207 || testFiles.length !== 38)
	throw new Error('vendored Radix source or canonical test inventory drifted');

console.log(
	`Radix upstream ledger is current (${packages.length} packages, ${sourceFiles.length} source files, ${testFiles.length} canonical tests, ${files.length} total files).`,
);
