import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { verifyReactResizablePanelsUpstream } from '../../../scripts/react-parity/react-resizable-panels-upstream-lib.mjs';
import { verifyReactResizablePanelsTestClassifications } from '../../../scripts/react-parity/react-resizable-panels-classifications-lib.mjs';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(packageRoot, '../..');
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
	const files = [];
	for (const entry of readdirSync(root, { withFileTypes: true })) {
		const path = join(root, entry.name);
		if (entry.isDirectory()) files.push(...walk(path));
		else if (entry.isFile()) files.push(path);
	}
	return files.sort();
}

function fail(message) {
	throw new Error(message);
}

function verifyHashes(
	lines = readFileSync(join(packageRoot, 'upstream/SHA256SUMS'), 'utf8').trim().split('\n'),
) {
	const expected = new Map(
		lines.map(function parseLine(line) {
			const match = /^(\w{64})  (.+)$/.exec(line);
			if (!match) fail(`Malformed checksum line: ${line}`);
			return [match[2], match[1]];
		}),
	);
	const actualPaths = [
		...walk(join(packageRoot, 'upstream/source')),
		...walk(join(packageRoot, 'upstream/npm')),
	].map(function toRelative(path) {
		return relative(packageRoot, path);
	});
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
const upstream = verifyReactResizablePanelsUpstream(repoRoot);
const classifications = verifyReactResizablePanelsTestClassifications(repoRoot);

if (process.argv.includes('--negative-controls')) {
	const checksumLines = readFileSync(join(packageRoot, 'upstream/SHA256SUMS'), 'utf8')
		.trim()
		.split('\n');
	expectFailure('deleted vendored identity', function deletedVendored() {
		verifyHashes(checksumLines.slice(1));
	});
	expectFailure('modified vendored identity', function modifiedVendored() {
		verifyHashes([checksumLines[0].replace(/^./, '0'), ...checksumLines.slice(1)]);
	});
	const api = JSON.parse(readFileSync(join(packageRoot, 'audit/public-api.json'), 'utf8'));
	expectFailure('missing runtime export', function missingRuntime() {
		verifyApi({ ...api, runtime: api.runtime.slice(1) });
	});
	expectFailure('extra public type', function extraType() {
		verifyApi({ ...api, types: [...api.types, 'WeakenedType'] });
	});
	const adaptedSumsPath = join(packageRoot, 'audit/upstream-adapted.SHA256SUMS');
	const adaptedSums = readFileSync(adaptedSumsPath, 'utf8');
	const firstAdapted = adaptedSums.trim().split('\n')[0];
	const adaptedMatch = /^(\w{64})  (.+)$/.exec(firstAdapted);
	if (!adaptedMatch) fail('Malformed adapted checksum line');
	const adaptedFile = join(packageRoot, 'tests/upstream', adaptedMatch[2]);
	const originalAdapted = readFileSync(adaptedFile);
	try {
		writeFileSync(
			adaptedFile,
			`${originalAdapted.toString('utf8').replace(/\n\s*expect\([^;]+;/, '\n')}`,
		);
		expectFailure('deleted adapted assertion body', function deletedAssertion() {
			verifyReactResizablePanelsUpstream(repoRoot);
		});
	} finally {
		writeFileSync(adaptedFile, originalAdapted);
	}
	const renamed = adaptedSums.replace(adaptedMatch[1], '0'.repeat(64));
	expectFailure('adapted SHA256SUMS drift', function adaptedHashDrift() {
		writeFileSync(adaptedSumsPath, renamed);
		try {
			verifyReactResizablePanelsUpstream(repoRoot);
		} finally {
			writeFileSync(adaptedSumsPath, adaptedSums);
		}
	});
}

console.log(
	`Verified ${readFileSync(join(packageRoot, 'upstream/SHA256SUMS'), 'utf8').trim().split('\n').length} vendored files, ${expectedRuntime.length} runtime exports, ${expectedTypes.length} public types, ${upstream.upstreamCases} upstream registrations, ${upstream.portedCases} adapted registrations (SHA256-locked), and ${classifications.tests} classified port tests.`,
);
