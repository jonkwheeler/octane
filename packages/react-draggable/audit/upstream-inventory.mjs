import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const inventoryPath = join(packageRoot, 'audit/upstream-inventory.json');

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function filesUnder(root) {
	const result = [];
	async function visit(directory) {
		for (const entry of await readdir(directory, { withFileTypes: true })) {
			const path = join(directory, entry.name);
			if (entry.isDirectory()) await visit(path);
			else result.push(relative(root, path).replaceAll('\\', '/'));
		}
	}
	await visit(root);
	return result.sort();
}

function staticCalls(source, callees) {
	const pattern = new RegExp(
		`\\b(?:${callees.join('|')})\\s*\\(\\s*(['\"\\x60])((?:\\\\.|(?!\\1)[\\s\\S])*?)\\1`,
		'g',
	);
	return [...source.matchAll(pattern)].map((match) => ({
		line: source.slice(0, match.index).split(/\r?\n/).length,
		name: match[2].replace(/\\(['\"`\\])/g, '$1'),
	}));
}

function expectTypeAssertions(source) {
	return source.split(/\r?\n/).flatMap((line, index) => {
		const trimmed = line.trim();
		return trimmed.startsWith('expectType<')
			? [{ id: `test/typeCompat/fixture.tsx:${index + 1}`, statement: trimmed }]
			: [];
	});
}

function parityMarkers(source, path) {
	return [...source.matchAll(/@parity-case\s+([^\s*]+)/g)].map((match) => ({
		id: match[1],
		path,
	}));
}

function adaptedUnitId(entry) {
	return `adapted-public:${entry.file}::${entry.name}`;
}

function adaptedUnitIdentity(entry) {
	return `${entry.file}::${entry.name}`;
}

function adaptedBrowserId(entry) {
	return `adapted-browser:${entry.id}`;
}

async function buildInventory(root = packageRoot) {
	const upstreamRoot = join(root, 'upstream');
	const artifactFiles = await filesUnder(upstreamRoot);
	const artifacts = [];
	for (const path of artifactFiles) {
		const bytes = await readFile(join(upstreamRoot, path));
		artifacts.push({ path, bytes: bytes.length, sha256: sha256(bytes) });
	}

	const unitFiles = artifactFiles.filter(
		(path) =>
			path.startsWith('tag/test/') &&
			!path.startsWith('tag/test/browser/') &&
			/\.test\.(?:js|jsx|ts|tsx)$/.test(path),
	);
	const unitCases = [];
	for (const path of unitFiles) {
		const source = await readFile(join(upstreamRoot, path), 'utf8');
		for (const { line, name } of staticCalls(source, ['it', 'test']))
			unitCases.push({ id: `${path}:${line}::${name}`, file: path, line, name });
	}
	const browserPath = 'tag/test/browser/browser.test.js';
	const browserSource = await readFile(join(upstreamRoot, browserPath), 'utf8');
	const browserCases = staticCalls(browserSource, ['it', 'test']).map(({ line, name }) => ({
		id: `${browserPath}:${line}::${name}`,
		file: browserPath,
		line,
		name,
	}));
	const typeSource = await readFile(join(upstreamRoot, 'tag/test/typeCompat/fixture.tsx'), 'utf8');

	const markerPaths = [
		'tests/runtime/draggable.test.ts',
		'tests/runtime/core.test.ts',
		'tests/differential/parity.test.ts',
		'tests/hydration/hydration.test.ts',
		'tests/ssr/server.test.ts',
		'tests/browser/parity.browser.test.ts',
	];
	const adaptedCases = [];
	for (const path of markerPaths) {
		const source = await readFile(join(root, path), 'utf8');
		adaptedCases.push(...parityMarkers(source, path));
	}
	const publicCasePath = 'tests/runtime/upstream-public.test.ts';
	const publicCaseSource = await readFile(join(root, publicCasePath), 'utf8');
	const publicCases = staticCalls(publicCaseSource, ['adaptedCase']);
	const publicUnitCases = unitCases.filter(
		(entry) => !entry.file.includes('/utils/') && entry.file !== 'tag/test/typeCompat.test.ts',
	);
	sameIdentities(publicCases, publicUnitCases, 'adapted public unit case', (value) =>
		value.file ? adaptedUnitIdentity(value) : value.name,
	);
	for (const entry of publicUnitCases) {
		const identity = adaptedUnitIdentity(entry);
		const matched = publicCases.find((candidate) => candidate.name === identity);
		adaptedCases.push({
			id: adaptedUnitId(entry),
			path: publicCasePath,
			name: entry.name,
			line: matched.line,
		});
	}
	for (const entry of browserCases) {
		const scenario = /iframe|shadow DOM|unmount|defocus|steal focus/.test(entry.name)
			? 'browser:react-draggable-ownership-cleanup'
			: 'browser:react-draggable-native';
		adaptedCases.push({
			id: adaptedBrowserId(entry),
			path: 'tests/browser/parity.browser.test.ts',
			name: entry.name,
			scenario,
		});
	}
	adaptedCases.push(
		{ id: 'type-program:public-api', path: 'typetests/public-api.test.ts' },
		{ id: 'type-program:pristine', path: 'typetests/tsconfig.pristine.json' },
		{ id: 'type-program:adapted', path: 'typetests/tsconfig.adapted.json' },
	);
	const adaptedById = new Map(adaptedCases.map((entry) => [entry.id, entry]));
	assert(
		adaptedById.size === adaptedCases.length,
		'adapted parity case identifiers must be unique',
	);
	for (const entry of adaptedCases.filter((value) => value.scenario)) {
		assert(adaptedById.has(entry.scenario), `${entry.id}: browser scenario marker is missing`);
	}

	const sourceFiles = artifactFiles.filter((path) => path.startsWith('tag/lib/'));
	const runtimeExports = ['default', 'DraggableCore'];
	const typeExports = [
		'ControlPosition',
		'DraggableBounds',
		'DraggableCoreProps',
		'DraggableData',
		'DraggableEvent',
		'DraggableEventHandler',
		'DraggableProps',
		'PositionOffsetControlPosition',
	];
	const fixtures = artifactFiles.filter(
		(path) => path.startsWith('tag/test/') && !/\.test\.(?:js|jsx|ts|tsx)$/.test(path),
	);

	const sourceEvidence = (path) => {
		if (path === 'tag/lib/Draggable.tsx')
			return ['src/Draggable.tsrx', 'tests/runtime/draggable.test.ts'];
		if (path === 'tag/lib/DraggableCore.tsx')
			return ['src/DraggableCore.tsrx', 'tests/runtime/core.test.ts'];
		if (path === 'tag/lib/cjs.ts' || path === 'tag/lib/umd.ts')
			return ['src/index.tsrx', 'tests/runtime/draggable.test.ts'];
		if (path === 'tag/lib/utils/types.ts') return ['src/types.ts', 'typetests/public-api.test.ts'];
		return [path.replace('tag/lib/', 'src/'), 'tests/runtime/upstream-public.test.ts'];
	};
	const unitCoverage = (entry) => {
		if (entry.file.includes('/utils/')) return [];
		if (entry.file === 'tag/test/typeCompat.test.ts') return ['type-program:public-api'];
		return [adaptedUnitId(entry)];
	};
	const evidenceFor = (caseIds) => [
		...new Set(
			caseIds.map((id) => {
				const matched = adaptedById.get(id);
				assert(matched, `unknown adapted parity case ${id}`);
				return matched.path;
			}),
		),
	];
	const adapted = (
		entry,
		kind,
		evidence,
		note = 'Adapted to the Octane public/runtime contract.',
		adaptedCases,
	) => ({
		upstream: entry,
		kind,
		disposition: 'adapted-and-executable',
		evidence,
		...(adaptedCases ? { adaptedCases } : {}),
		note,
	});
	return {
		schemaVersion: 1,
		release: {
			package: 'react-draggable',
			version: '4.7.1',
			tag: 'v4.7.1',
			npmIntegrity:
				'sha512-wa3tzfFnYt3yaZLuyU58fl1TNunfWfBekDgWhZA1+gb2jnp42wZ0ymuopR6M5kqDYmm4hKmzGlcKWjZf3Zb6RQ==',
			npmShasum: 'e502c3cfe0cc97d691e12aaa377a975fce097d71',
			tagObject: 'cec7498ff84e91215987636d3edbb6ca132ee9e5',
			commit: 'bcbaa8eb285aea49865ca8870c0b7b441c2fe6a4',
			tree: '7b17a5d02449287945f87dee0cecdadcfb56cdc5',
			license: 'MIT',
		},
		publicSurface: { runtimeExports, typeExports, subpaths: ['.', './package.json'] },
		artifacts,
		inventories: {
			sourceFiles,
			unitFiles,
			unitCases,
			browserCases,
			fixtures,
			typeAssertions: expectTypeAssertions(typeSource),
			adaptedCases,
		},
		crosswalk: {
			source: sourceFiles.map((value) =>
				adapted(
					value,
					'source',
					sourceEvidence(value),
					'Ported source with executable contract coverage.',
				),
			),
			runtimeExports: runtimeExports.map((value) =>
				adapted(value, 'runtime-export', ['src/index.tsrx', 'tests/runtime/draggable.test.ts']),
			),
			typeExports: typeExports.map((value) =>
				adapted(value, 'type-export', ['src/index.tsrx', 'typetests/public-api.test.ts']),
			),
			unitCases: unitCases.map((value) => {
				const caseIds = unitCoverage(value);
				if (value.file.includes('/utils/')) {
					const sourcePath =
						value.file.includes('domFns') || value.file.includes('positionFns')
							? ['src/utils/domFns.ts', 'src/utils/positionFns.ts']
							: value.file.includes('getPrefix')
								? ['src/utils/getPrefix.ts']
								: ['src/utils/shims.ts'];
					return {
						upstream: value.id,
						kind: 'unit-case',
						disposition: 'upstream-internal-implementation',
						evidence: sourcePath,
						note: 'The upstream case targets an unexported helper. Octane preserves the public behavior through component/runtime/browser cases without pinning private implementation seams.',
					};
				}
				return adapted(
					value.id,
					'unit-case',
					evidenceFor(caseIds),
					'Mapped one-to-one to an executable public-root adapted test.',
					caseIds,
				);
			}),
			browserCases: browserCases.map((value) => {
				const caseIds = [adaptedBrowserId(value)];
				return adapted(
					value.id,
					'browser-case',
					evidenceFor(caseIds),
					'Mapped to a unique behavior dimension in the selected-engine real-browser scenario, which CI executes once in Chromium and once in Firefox.',
					caseIds,
				);
			}),
			fixtures: fixtures.map((value) =>
				adapted(
					value,
					'fixture',
					['tests/browser/parity.browser.test.ts'],
					'Replaced by deterministic Octane real-browser fixtures.',
				),
			),
			typeAssertions: expectTypeAssertions(typeSource).map((value) =>
				adapted(
					value.id,
					'type-assertion',
					[
						'typetests/public-api.test.ts',
						'typetests/tsconfig.pristine.json',
						'typetests/tsconfig.adapted.json',
					],
					'Checked by both pristine-upstream and adapted public-contract type programs.',
					['type-program:public-api', 'type-program:pristine', 'type-program:adapted'],
				),
			),
			authoredTests: [
				{
					upstream: 'octane-only:upstream-inventory-negative-controls',
					kind: 'octane-only-test',
					disposition: 'octane-only-framework-contract',
					evidence: ['tests/audit/upstream-inventory.test.mjs'],
					path: 'tests/audit/upstream-inventory.test.mjs',
					classification: 'octane-only-framework-contract',
					reason:
						'Negative controls prove that the provenance and crosswalk machinery fails closed; upstream has no equivalent self-audit.',
				},
			],
		},
		allowedTransforms: [],
	};
}

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

function sameIdentities(actual, expected, label, getId = (value) => value) {
	const actualIds = actual.map(getId);
	const expectedIds = expected.map(getId);
	const duplicates = actualIds.filter((id, index) => actualIds.indexOf(id) !== index);
	assert(duplicates.length === 0, `${label}: duplicate identity ${duplicates[0]}`);
	for (const id of expectedIds) assert(actualIds.includes(id), `${label}: missing identity ${id}`);
	for (const id of actualIds)
		assert(expectedIds.includes(id), `${label}: unapproved identity ${id}`);
}

export async function validate(root = packageRoot) {
	const expected = JSON.parse(await readFile(join(root, 'audit/upstream-inventory.json'), 'utf8'));
	const actual = await buildInventory(root);
	assert(
		JSON.stringify(actual.release) === JSON.stringify(expected.release),
		'immutable release coordinates changed',
	);
	sameIdentities(actual.artifacts, expected.artifacts, 'artifact', (value) => value.path);
	for (const artifact of expected.artifacts) {
		const current = actual.artifacts.find((value) => value.path === artifact.path);
		assert(current.sha256 === artifact.sha256, `artifact: stale hash ${artifact.path}`);
		assert(current.bytes === artifact.bytes, `artifact: byte length changed ${artifact.path}`);
	}
	sameIdentities(
		actual.publicSurface.runtimeExports,
		expected.publicSurface.runtimeExports,
		'runtime export',
	);
	sameIdentities(
		actual.publicSurface.typeExports,
		expected.publicSurface.typeExports,
		'type export',
	);
	sameIdentities(actual.publicSurface.subpaths, expected.publicSurface.subpaths, 'package subpath');
	sameIdentities(
		actual.inventories.unitCases,
		expected.inventories.unitCases,
		'unit case',
		(value) => value.id,
	);
	sameIdentities(
		actual.inventories.browserCases,
		expected.inventories.browserCases,
		'browser case',
		(value) => value.id,
	);
	sameIdentities(
		actual.inventories.typeAssertions,
		expected.inventories.typeAssertions,
		'type assertion',
		(value) => value.id,
	);
	sameIdentities(
		actual.inventories.adaptedCases,
		expected.inventories.adaptedCases,
		'adapted case',
		(value) => value.id,
	);

	for (const [ledger, inventory] of [
		['source', expected.inventories.sourceFiles],
		['runtimeExports', expected.publicSurface.runtimeExports],
		['typeExports', expected.publicSurface.typeExports],
		['unitCases', expected.inventories.unitCases.map((value) => value.id)],
		['browserCases', expected.inventories.browserCases.map((value) => value.id)],
		['fixtures', expected.inventories.fixtures],
		['typeAssertions', expected.inventories.typeAssertions.map((value) => value.id)],
	]) {
		sameIdentities(
			expected.crosswalk[ledger],
			inventory,
			`${ledger} disposition`,
			(value) => value.upstream ?? value,
		);
	}
	const allDispositions = Object.values(expected.crosswalk).flat();
	assert(
		!allDispositions.some((value) =>
			/\.skip|\.todo|expected.?failure/i.test(value.disposition ?? ''),
		),
		'skip marker is not an approved disposition',
	);
	assert(
		!allDispositions.some(
			(value) => !value.disposition || /pending|unresolved/i.test(value.disposition),
		),
		'every upstream item must have a resolved disposition',
	);
	assert(
		!allDispositions.some((value) => !Array.isArray(value.evidence) || value.evidence.length === 0),
		'every upstream disposition must cite executable or source evidence',
	);
	const availableEvidence = new Set(
		(await filesUnder(root)).filter((path) => !path.startsWith('upstream/')),
	);
	const adaptedCaseIds = new Set(expected.inventories.adaptedCases.map((value) => value.id));
	for (const value of allDispositions) {
		for (const path of value.evidence)
			assert(availableEvidence.has(path), `crosswalk evidence is missing: ${path}`);
		if (
			['unit-case', 'browser-case', 'type-assertion'].includes(value.kind) &&
			value.disposition === 'adapted-and-executable'
		) {
			assert(
				Array.isArray(value.adaptedCases) && value.adaptedCases.length > 0,
				`${value.upstream}: explicit adapted case mapping is missing`,
			);
			for (const id of value.adaptedCases)
				assert(adaptedCaseIds.has(id), `${value.upstream}: adapted case is missing: ${id}`);
		}
	}
	const oneToOneCaseIds = [...expected.crosswalk.unitCases, ...expected.crosswalk.browserCases]
		.filter(
			(value) =>
				['unit-case', 'browser-case'].includes(value.kind) &&
				!value.upstream.startsWith('tag/test/typeCompat.test.ts:') &&
				value.disposition === 'adapted-and-executable',
		)
		.flatMap((value) => value.adaptedCases);
	const reusedCaseId = oneToOneCaseIds.find((id, index) => oneToOneCaseIds.indexOf(id) !== index);
	assert(!reusedCaseId, `adapted case is mapped more than once: ${reusedCaseId}`);

	const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
	sameIdentities(Object.keys(manifest.exports), ['.', './package.json'], 'package subpath');
	assert(
		!manifest.files.some((path) => /^(?:upstream|audit|tests\/audit)(?:\/|$)/.test(path)),
		'audit evidence must not be published',
	);
	const license = await readFile(join(root, 'LICENSE'), 'utf8');
	const upstreamLicense = await readFile(join(root, 'upstream/tag/LICENSE'), 'utf8');
	assert(
		license === upstreamLicense && license.includes('MIT License'),
		'MIT license is missing or changed',
	);
	return actual;
}

if (process.argv[1] && basename(process.argv[1]) === basename(fileURLToPath(import.meta.url))) {
	const write = process.argv.includes('--write');
	const rootArg = process.argv.indexOf('--root');
	const root = rootArg === -1 ? packageRoot : resolve(process.argv[rootArg + 1]);
	if (write) {
		await writeFile(
			join(root, 'audit/upstream-inventory.json'),
			`${JSON.stringify(await buildInventory(root), null, 2)}\n`,
		);
		console.log('wrote react-draggable upstream inventory');
	} else {
		const result = await validate(root);
		console.log(
			`verified ${result.artifacts.length} artifacts, ${result.inventories.unitCases.length} unit/type cases, ${result.inventories.browserCases.length} browser cases, and ${result.inventories.typeAssertions.length} type assertions`,
		);
	}
}
