import { createHash } from 'node:crypto';
import { access, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const EXECUTABLE_DISPOSITIONS = new Set(['adapted-and-executable']);
const PENDING_DISPOSITIONS = new Set(['pending-adaptation']);

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

function directCases(source) {
	const pattern = /^\s*(?:it|test)\s*\(\s*(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/gm;
	return [...source.matchAll(pattern)].map((match) => ({
		index: match.index,
		line: source.slice(0, match.index).split(/\r?\n/).length,
		name: match[2].replace(/\\(["'`\\])/g, '$1'),
	}));
}

function eachCases(source) {
	const pattern =
		/^\s*(?:it|test)\.each(?:<[^;]*?>)?\s*`[\s\S]*?`\s*\(\s*(["'])((?:\\.|(?!\1)[\s\S])*?)\1/gm;
	return [...source.matchAll(pattern)].map((match) => ({
		index: match.index,
		line: source.slice(0, match.index).split(/\r?\n/).length,
		name: match[2].replace(/\\(["'\\])/g, '$1'),
	}));
}

function staticCases(source) {
	return [...directCases(source), ...eachCases(source)]
		.sort((left, right) => left.index - right.index)
		.map(({ index: _index, ...entry }) => entry);
}

function testTitles(source) {
	return new Set(staticCases(source).map(({ name }) => name));
}

function normalizeMapping(value) {
	if (typeof value === 'string') {
		if (value.startsWith('disposition:')) {
			return {
				disposition: value.slice('disposition:'.length),
				rationale:
					'No one-for-one Octane counterpart yet; ordinary package coverage is not adapted-octane parity evidence.',
			};
		}
		return {
			disposition: 'adapted-and-executable',
			evidence: value,
		};
	}
	assert(value && typeof value === 'object', 'case-map entries must be strings or objects');
	assert(typeof value.disposition === 'string', 'case-map disposition is required');
	return value;
}

async function upstreamCases(root, artifactPaths) {
	const cases = [];
	for (const file of artifactPaths.filter((path) =>
		/^tag\/src\/.*\.(?:spec|test)\.tsx?$/.test(path),
	)) {
		const source = await readFile(join(root, 'upstream', file), 'utf8');
		for (const entry of staticCases(source)) {
			cases.push({
				id: `${file}:${entry.line}::${entry.name}`,
				file,
				...entry,
				kind: 'runtime',
			});
		}
	}
	return cases;
}

function defaultMapping(entry) {
	// Only exact one-for-one private helpers are claimed as adapted evidence.
	// Everything else is an explicit pending disposition until a dedicated counterpart exists.
	if (entry.file.endsWith('shared/utils.spec.ts')) {
		if (entry.name === 'throws given invalid data URI') {
			return {
				disposition: 'adapted-and-executable',
				evidence:
					'tests/runtime/private-evidence.test.ts::matches upstream data URI and source utilities',
			};
		}
	}
	if (entry.file.endsWith('Ref.spec.ts')) {
		if (entry.name === 'returns proper reference for given num and gen') {
			return {
				disposition: 'adapted-and-executable',
				evidence:
					'tests/runtime/private-evidence.test.ts::preserves Ref number and generation values',
			};
		}
	}
	return {
		disposition: 'pending-adaptation',
		rationale:
			'No one-for-one Octane counterpart yet. Browser, shell, SSR, feasibility, and packed coverage remain ordinary package tests outside adapted-octane parity accounting.',
	};
}

export async function buildDefaultCaseMap(root = packageRoot) {
	const paths = await filesUnder(join(root, 'upstream'));
	const cases = await upstreamCases(root, paths);
	return Object.fromEntries(cases.map((entry) => [entry.id, defaultMapping(entry)]));
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
	const cases = await upstreamCases(root, artifactPaths);
	const caseMap = JSON.parse(await readFile(join(root, 'audit/case-map.json'), 'utf8'));
	const upstreamIds = cases.map(({ id }) => id);

	assert(
		new Set(upstreamIds).size === upstreamIds.length,
		'upstream case identities must be unique',
	);
	assert(Object.keys(caseMap).length === cases.length, 'case map count does not match upstream');
	for (const id of upstreamIds) assert(caseMap[id], `missing executable mapping for ${id}`);
	for (const id of Object.keys(caseMap)) {
		assert(upstreamIds.includes(id), `stale or renamed upstream mapping ${id}`);
	}

	const evidenceCache = new Map();
	const crosswalk = [];
	for (const entry of cases) {
		const mapping = normalizeMapping(caseMap[entry.id]);
		assert(
			EXECUTABLE_DISPOSITIONS.has(mapping.disposition) ||
				PENDING_DISPOSITIONS.has(mapping.disposition),
			`unknown disposition for ${entry.id}: ${mapping.disposition}`,
		);
		if (EXECUTABLE_DISPOSITIONS.has(mapping.disposition)) {
			assert(typeof mapping.evidence === 'string', `missing evidence for ${entry.id}`);
			const split = mapping.evidence.lastIndexOf('::');
			const path = mapping.evidence.slice(0, split);
			const title = mapping.evidence.slice(split + 2);
			await access(join(root, path));
			if (!evidenceCache.has(path)) {
				evidenceCache.set(path, testTitles(await readFile(join(root, path), 'utf8')));
			}
			assert(
				evidenceCache.get(path).has(title),
				`mapped executable test is missing: ${mapping.evidence}`,
			);
			crosswalk.push({
				upstream: entry.id,
				disposition: mapping.disposition,
				evidence: mapping.evidence,
			});
		} else {
			assert(
				typeof mapping.rationale === 'string' && mapping.rationale.length > 0,
				`pending disposition for ${entry.id} requires rationale`,
			);
			crosswalk.push({
				upstream: entry.id,
				disposition: mapping.disposition,
				rationale: mapping.rationale,
			});
		}
	}

	const publicSurface = JSON.parse(
		await readFile(join(root, 'upstream-public-surface.json'), 'utf8'),
	);
	const indexSource = await readFile(join(root, 'src/index.ts'), 'utf8');
	for (const name of [...publicSurface.rootRuntimeExports, ...publicSurface.rootTypeExports]) {
		assert(new RegExp(`\\b${name}\\b`).test(indexSource), `missing public export ${name}`);
	}

	return {
		schemaVersion: 1,
		release: {
			package: 'react-pdf',
			version: '10.4.1',
			tag: 'v10.4.1',
			commit: '5338e7a24c7ad17d1028146cf8a025a75e0abe79',
			tagArchiveSha256: 'afc69e121c7f845dbc6bf88e584c5a7a74154c3e2b89c35ce42b3b3bb93d86ce',
			npmIntegrity:
				'sha512-kS/35staVCBqS29verTQJQZXw7RfsRCPO3fdJoW1KXylcv7A9dw6DZ3vJXC2w+bIBgLw5FN4pOFvKSQtkQhPfA==',
			npmShasum: '7419d45a96ffbce09e2d9919ee330a0d5147d2ed',
			npmTarballSha256: '41cd9570bca79572aa2b78b1dcec90f308291a5a85e680f4b751950e16c4d525',
			license: 'MIT',
		},
		publicSurface: {
			runtimeExports: publicSurface.rootRuntimeExports,
			typeExports: publicSurface.rootTypeExports,
			subpaths: ['.', './dist/Page/AnnotationLayer.css', './dist/Page/TextLayer.css'],
		},
		artifacts,
		upstreamCases: cases,
		crosswalk,
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
	if (process.argv.includes('--print-case-map')) {
		console.log(JSON.stringify(await buildDefaultCaseMap(), null, 2));
	} else if (process.argv.includes('--write-case-map')) {
		const caseMap = await buildDefaultCaseMap();
		const destination = join(packageRoot, 'audit/case-map.json');
		await writeFile(destination, `${JSON.stringify(caseMap, null, 2)}\n`);
		console.log(`${destination}: ${Object.keys(caseMap).length} entries`);
	} else if (process.argv.includes('--print-inventory')) {
		console.log(JSON.stringify(await buildInventory(), null, 2));
	} else if (process.argv.includes('--write-inventory')) {
		const inventory = await buildInventory();
		const destination = join(packageRoot, 'audit/upstream-inventory.json');
		await writeFile(destination, `${JSON.stringify(inventory, null, 2)}\n`);
		console.log(
			`${destination}: ${inventory.artifacts.length} artifacts, ${inventory.upstreamCases.length} cases`,
		);
	} else {
		const inventory = await validate();
		console.log(
			`verified ${inventory.artifacts.length} artifacts and ${inventory.upstreamCases.length} upstream cases`,
		);
	}
}
