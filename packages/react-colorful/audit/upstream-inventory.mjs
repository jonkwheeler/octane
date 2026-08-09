import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const inventoryPath = join(packageRoot, 'audit/upstream-inventory.json');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

async function filesUnder(root) {
	const files = [];
	async function visit(directory) {
		for (const entry of await readdir(directory, { withFileTypes: true })) {
			const path = join(directory, entry.name);
			if (entry.isDirectory()) await visit(path);
			else files.push(relative(root, path).replaceAll('\\', '/'));
		}
	}
	await visit(root);
	return files.sort();
}

function staticCases(source, topLevel = false) {
	const pattern = topLevel
		? /^(?:it|test)\s*\(\s*(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/gm
		: /^\s*(?:it|test)\s*\(\s*(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/gm;
	return [...source.matchAll(pattern)].map((match) => ({
		line: source.slice(0, match.index).split(/\r?\n/).length,
		name: match[2].replace(/\\(["'`\\])/g, '$1'),
	}));
}

function testTitles(source) {
	return new Set(staticCases(source).map(({ name }) => name));
}

export async function buildInventory(root = packageRoot) {
	const upstreamRoot = join(root, 'upstream');
	const artifactPaths = await filesUnder(upstreamRoot);
	const artifacts = await Promise.all(
		artifactPaths.map(async (path) => {
			const bytes = await readFile(join(upstreamRoot, path));
			return { path, bytes: bytes.length, sha256: sha256(bytes) };
		}),
	);
	const upstreamTestFiles = artifactPaths.filter(
		(path) => /tag\/tests\/.*\.(?:js|ts)$/.test(path) && !path.includes('/__mocks__/'),
	);
	const cases = [];
	for (const file of upstreamTestFiles) {
		const source = await readFile(join(upstreamRoot, file), 'utf8');
		for (const entry of staticCases(source, true))
			cases.push({ id: `${file}::${entry.name}`, file, ...entry });
	}
	const explicitCaseMap = JSON.parse(await readFile(join(root, 'audit/case-map.json'), 'utf8'));
	const caseMap = Object.fromEntries(
		cases.map((entry) => {
			if (explicitCaseMap[entry.id]) return [entry.id, explicitCaseMap[entry.id]];
			throw new Error(`missing executable mapping for ${entry.id}`);
		}),
	);
	const upstreamIds = cases.map(({ id }) => id);
	assert(
		new Set(upstreamIds).size === upstreamIds.length,
		'upstream case identities must be unique',
	);
	assert(
		Object.keys(explicitCaseMap).length === cases.length,
		`case map count ${Object.keys(explicitCaseMap).length} does not match ${cases.length}`,
	);
	for (const id of upstreamIds) assert(caseMap[id], `missing executable mapping for ${id}`);
	for (const id of Object.keys(explicitCaseMap))
		assert(upstreamIds.includes(id), `stale or renamed upstream mapping ${id}`);

	const evidenceCache = new Map();
	for (const evidence of Object.values(caseMap)) {
		const split = evidence.lastIndexOf('::');
		const path = evidence.slice(0, split);
		const title = evidence.slice(split + 2);
		if (!evidenceCache.has(path))
			evidenceCache.set(path, testTitles(await readFile(join(root, path), 'utf8')));
		assert(evidenceCache.get(path).has(title), `mapped executable test is missing: ${evidence}`);
	}

	const runtimeExports = [
		'HexAlphaColorPicker',
		'HexColorInput',
		'HexColorPicker',
		'HslColorPicker',
		'HslStringColorPicker',
		'HslaColorPicker',
		'HslaStringColorPicker',
		'HsvColorPicker',
		'HsvStringColorPicker',
		'HsvaColorPicker',
		'HsvaStringColorPicker',
		'RgbColorPicker',
		'RgbStringColorPicker',
		'RgbaColorPicker',
		'RgbaStringColorPicker',
		'setNonce',
	];
	const typeExports = ['HslColor', 'HslaColor', 'HsvColor', 'HsvaColor', 'RgbColor', 'RgbaColor'];
	const indexSource = await readFile(join(root, 'src/index.ts'), 'utf8');
	for (const name of [...runtimeExports, ...typeExports])
		assert(new RegExp(`\\b${name}\\b`).test(indexSource), `missing public export ${name}`);

	return {
		schemaVersion: 1,
		release: {
			package: 'react-colorful',
			version: '5.8.0',
			tag: 'v5.8.0',
			npmIntegrity:
				'sha512-Wy9OzPfjSN9bF12OB8N7UQvlsZ0I+7wHxpN+bV5BjNQGxOj6IiwkRjevJK9yOBjJWGQvAaf1OXtn8rUeEatAng==',
			npmShasum: '9bc89aac3e8c847b503489614e2d28227b36641f',
			commit: 'd914e7647c40a8bbdb286985176e769d76061732',
			license: 'MIT',
		},
		publicSurface: { runtimeExports, typeExports, subpaths: ['.'] },
		artifacts,
		upstreamCases: cases,
		crosswalk: cases.map((entry) => ({
			upstream: entry.id,
			disposition: 'adapted-and-executable',
			evidence: caseMap[entry.id],
		})),
	};
}

export function compareInventories(actual, expected) {
	assert(
		JSON.stringify(actual.release) === JSON.stringify(expected.release),
		'immutable release coordinates changed',
	);
	assert(
		JSON.stringify(actual.publicSurface) === JSON.stringify(expected.publicSurface),
		'public surface changed',
	);
	assert(
		JSON.stringify(actual.artifacts) === JSON.stringify(expected.artifacts),
		'upstream artifact inventory or checksum changed',
	);
	assert(
		JSON.stringify(actual.upstreamCases) === JSON.stringify(expected.upstreamCases),
		'upstream case inventory changed',
	);
	assert(
		JSON.stringify(actual.crosswalk) === JSON.stringify(expected.crosswalk),
		'upstream executable crosswalk changed',
	);
}

export async function validate(root = packageRoot) {
	const actual = await buildInventory(root);
	const expected = JSON.parse(await readFile(join(root, 'audit/upstream-inventory.json'), 'utf8'));
	compareInventories(actual, expected);
	return actual;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const inventory = await buildInventory();
	if (process.argv.includes('--write')) {
		await writeFile(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`);
		console.log(`wrote ${relative(packageRoot, inventoryPath)}`);
	} else {
		await validate();
		console.log(
			`verified ${inventory.artifacts.length} artifacts and ${inventory.upstreamCases.length} upstream cases`,
		);
	}
}
