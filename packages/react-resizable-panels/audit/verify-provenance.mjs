import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const expectedRuntime = [
	'Group',
	'Panel',
	'Separator',
	'isCoarsePointer',
	'useDefaultLayout',
	'useGroupCallbackRef',
	'useGroupRef',
	'usePanelCallbackRef',
	'usePanelRef',
].sort();
const expectedTypes = [
	'GroupImperativeHandle',
	'GroupProps',
	'Layout',
	'LayoutChangedMeta',
	'LayoutStorage',
	'OnGroupLayoutChange',
	'OnPanelResize',
	'Orientation',
	'PanelImperativeHandle',
	'PanelProps',
	'PanelSize',
	'SeparatorProps',
	'SizeUnit',
].sort();

function walk(root) {
	return readdirSync(root, { recursive: true })
		.map((path) => join(root, path))
		.filter((path) => statSync(path).isFile())
		.sort();
}

function fail(message) {
	throw new Error(message);
}

function verifyHashes(
	lines = readFileSync(join(packageRoot, 'upstream/SHA256SUMS'), 'utf8').trim().split('\n'),
) {
	const expected = new Map(
		lines.map((line) => {
			const match = /^(\w{64})  (.+)$/.exec(line);
			if (!match) fail(`Malformed checksum line: ${line}`);
			return [match[2], match[1]];
		}),
	);
	const actualPaths = [
		...walk(join(packageRoot, 'upstream/source')),
		...walk(join(packageRoot, 'upstream/npm')),
	].map((path) => relative(packageRoot, path));
	if (actualPaths.length !== expected.size) fail('Vendored file added or removed');
	for (const path of actualPaths) {
		const wanted = expected.get(path);
		if (!wanted) fail(`Unexpected vendored file: ${path}`);
		const actual = createHash('sha256')
			.update(readFileSync(join(packageRoot, path)))
			.digest('hex');
		if (actual !== wanted) fail(`Checksum mismatch: ${path}`);
	}
}

function verifyApi(
	api = JSON.parse(readFileSync(join(packageRoot, 'audit/public-api.json'), 'utf8')),
) {
	if (JSON.stringify([...api.runtime].sort()) !== JSON.stringify(expectedRuntime))
		fail('Runtime export inventory drift');
	if (JSON.stringify([...api.types].sort()) !== JSON.stringify(expectedTypes))
		fail('Public type inventory drift');
	const sourceIndex = readFileSync(join(packageRoot, 'upstream/source/lib/index.ts'), 'utf8');
	for (const name of [...expectedRuntime, ...expectedTypes]) {
		if (!new RegExp(`\\b${name}\\b`).test(sourceIndex))
			fail(`Upstream index no longer exports ${name}`);
	}
	const declaration = readFileSync(
		join(packageRoot, 'upstream/npm/dist/react-resizable-panels.d.ts'),
		'utf8',
	);
	for (const name of [...expectedRuntime, ...expectedTypes]) {
		if (!new RegExp(`export declare (?:function|interface|type) ${name}\\b`).test(declaration)) {
			fail(`Published declaration no longer exports ${name}`);
		}
	}
}

function extractTests() {
	const root = join(packageRoot, 'upstream/source/lib');
	return walk(root)
		.filter((path) => /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(path))
		.map((path) => {
			const source = readFileSync(path, 'utf8');
			const identities = [...source.matchAll(/\b(?:it|test)\s*\(\s*(["'])(.*?)\1/gs)].map(
				(match) => match[2],
			);
			return {
				path: relative(root, path),
				registrationCount: identities.length,
				identities,
			};
		});
}

function verifyTests(
	inventory = JSON.parse(readFileSync(join(packageRoot, 'audit/test-inventory.json'), 'utf8')),
) {
	const actual = extractTests();
	const recorded = inventory.artifacts.map(({ path, registrationCount, identities }) => ({
		path,
		registrationCount,
		identities,
	}));
	if (JSON.stringify(recorded) !== JSON.stringify(actual))
		fail('Upstream test identity inventory drift');
	if (inventory.artifactCount !== actual.length) fail('Upstream test artifact count drift');
	const count = actual.reduce((total, artifact) => total + artifact.registrationCount, 0);
	if (inventory.registrationCount !== count) fail('Upstream test registration count drift');
	for (const artifact of inventory.artifacts) {
		if (artifact.disposition !== 'adapted')
			fail(`Upstream artifact is not adapted: ${artifact.path}`);
		if (artifact.disposition === 'adapted') {
			if (!artifact.adaptedPath) fail(`Adapted artifact lacks path: ${artifact.path}`);
			const adaptedSource = readFileSync(join(packageRoot, artifact.adaptedPath), 'utf8');
			if (/\b(?:it|test|describe)\.(?:skip|todo)\b/.test(adaptedSource))
				fail(`Skipped/todo adapted registration found: ${artifact.adaptedPath}`);
			const adaptedIdentities = [...adaptedSource.matchAll(/\b(?:it|test)\s*\(\s*(["'])(.*?)\1/gs)]
				.map((match) => match[2])
				.sort();
			if (JSON.stringify(adaptedIdentities) !== JSON.stringify([...artifact.identities].sort()))
				fail(`Adapted registration identity/count drift: ${artifact.path}`);
		} else if (artifact.adaptedPath)
			fail(`Non-adapted artifact declares adaptedPath: ${artifact.path}`);
	}
	const source = actual
		.map((artifact) =>
			readFileSync(join(packageRoot, 'upstream/source/lib', artifact.path), 'utf8'),
		)
		.join('\n');
	if (/\b(?:it|test|describe)\.(?:skip|todo)\b/.test(source))
		fail('Skipped/todo upstream test registration found');
}

function verifyPortTests(
	inventory = JSON.parse(readFileSync(join(packageRoot, 'audit/port-test-inventory.json'), 'utf8')),
) {
	if (inventory.artifactCount !== inventory.artifacts.length)
		fail('Port test artifact count drift');
	const count = inventory.artifacts.reduce(
		(total, artifact) => total + artifact.registrationCount,
		0,
	);
	if (inventory.registrationCount !== count) fail('Port test registration count drift');
	for (const artifact of inventory.artifacts) {
		if (artifact.classification !== 'port-authored')
			fail(`Invalid port test classification: ${artifact.path}`);
		const source = readFileSync(join(packageRoot, artifact.path), 'utf8');
		for (const identity of artifact.identities)
			if (!source.includes(identity))
				fail(`Port identity missing: ${artifact.path} :: ${identity}`);
	}
}

function expectFailure(label, callback) {
	try {
		callback();
	} catch {
		return;
	}
	fail(`Negative control did not fail: ${label}`);
}

verifyHashes();
verifyApi();
verifyTests();
verifyPortTests();

if (process.argv.includes('--negative-controls')) {
	const checksumLines = readFileSync(join(packageRoot, 'upstream/SHA256SUMS'), 'utf8')
		.trim()
		.split('\n');
	expectFailure('deleted vendored identity', () => verifyHashes(checksumLines.slice(1)));
	expectFailure('modified vendored identity', () =>
		verifyHashes([checksumLines[0].replace(/^./, '0'), ...checksumLines.slice(1)]),
	);
	const api = JSON.parse(readFileSync(join(packageRoot, 'audit/public-api.json'), 'utf8'));
	expectFailure('missing runtime export', () =>
		verifyApi({ ...api, runtime: api.runtime.slice(1) }),
	);
	expectFailure('extra public type', () =>
		verifyApi({ ...api, types: [...api.types, 'WeakenedType'] }),
	);
	const tests = JSON.parse(readFileSync(join(packageRoot, 'audit/test-inventory.json'), 'utf8'));
	expectFailure('missing test artifact', () =>
		verifyTests({ ...tests, artifacts: tests.artifacts.slice(1) }),
	);
	const renamed = structuredClone(tests);
	renamed.artifacts[0].identities[0] += ' renamed';
	expectFailure('renamed test identity', () => verifyTests(renamed));
	const unadapted = structuredClone(tests);
	unadapted.artifacts[0].disposition = 'accounted-not-adapted';
	delete unadapted.artifacts[0].adaptedPath;
	expectFailure('unadapted upstream artifact', () => verifyTests(unadapted));
	const portTests = JSON.parse(
		readFileSync(join(packageRoot, 'audit/port-test-inventory.json'), 'utf8'),
	);
	expectFailure('missing port test artifact', () =>
		verifyPortTests({ ...portTests, artifacts: portTests.artifacts.slice(1) }),
	);
}

console.log(
	`Verified ${readFileSync(join(packageRoot, 'upstream/SHA256SUMS'), 'utf8').trim().split('\n').length} vendored files, ${expectedRuntime.length} runtime exports, ${expectedTypes.length} public types, ${JSON.parse(readFileSync(join(packageRoot, 'audit/test-inventory.json'), 'utf8')).registrationCount} upstream registrations, and ${JSON.parse(readFileSync(join(packageRoot, 'audit/port-test-inventory.json'), 'utf8')).registrationCount} port-authored registrations.`,
);
