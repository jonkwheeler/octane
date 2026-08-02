import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const ROOT = 'packages/react-spring/upstream';

function filesUnder(root) {
	return readdirSync(root, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => join(entry.parentPath ?? entry.path, entry.name));
}

function digest(path) {
	return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export function verifyReactSpringUpstream(repoRoot) {
	const root = join(repoRoot, ROOT);
	const inventoryPath = join(root, 'SHA256SUMS');
	if (!existsSync(inventoryPath)) throw new Error('React Spring SHA256SUMS is missing');
	const expected = new Map(
		readFileSync(inventoryPath, 'utf8')
			.trim()
			.split('\n')
			.map((line) => {
				const match = /^([a-f0-9]{64})  (\.\/.*)$/.exec(line);
				if (match === null) throw new Error(`invalid checksum line: ${line}`);
				return [match[2].slice(2), match[1]];
			}),
	);
	const actual = filesUnder(root)
		.filter((path) => path !== inventoryPath)
		.map((path) => relative(root, path).replaceAll('\\', '/'))
		.sort();
	if (actual.length !== expected.size || actual.some((path) => !expected.has(path))) {
		throw new Error('vendored file inventory drifted from the pinned release');
	}
	for (const path of actual) {
		if (digest(join(root, path)) !== expected.get(path)) {
			throw new Error(`vendored byte drift: ${path}`);
		}
	}
	const required = [
		'LICENSE',
		'packages/animated/src/createHost.ts',
		'packages/core/src/index.ts',
		'packages/core/src/SpringValue.test.ts',
		'packages/parallax/src/index.tsx',
		'packages/shared/src/index.ts',
		'packages/types/src/index.ts',
		'targets/web/src/index.ts',
		'targets/web/src/animated.test.tsx',
	];
	for (const path of required) {
		if (!expected.has(path)) throw new Error(`required upstream boundary is missing: ${path}`);
	}
	return { files: actual.length, checksum: digest(inventoryPath) };
}
