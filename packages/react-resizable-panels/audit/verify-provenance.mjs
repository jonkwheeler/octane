import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	renderReactResizablePanelsAdaptedInventory,
	structuralSupportSource,
	verifyReactResizablePanelsUpstream,
} from '../../../scripts/react-parity/react-resizable-panels-upstream-lib.mjs';
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
	const weakenedAdapted = `${originalAdapted.toString('utf8').replace(/\n\s*expect\([^;]+;/, '\n')}`;
	try {
		writeFileSync(adaptedFile, weakenedAdapted);
		expectFailure('deleted adapted assertion body', function deletedAssertion() {
			verifyReactResizablePanelsUpstream(repoRoot);
		});
		// Regenerating the blessed SHA list must not hide a deleted assertion: the
		// pristine-to-adapted assertion-group mapping remains fail-closed.
		writeFileSync(adaptedSumsPath, renderReactResizablePanelsAdaptedInventory(repoRoot));
		expectFailure(
			'deleted assertion after regenerating adapted SHA list',
			function deletedAssertionAfterHashBlessing() {
				verifyReactResizablePanelsUpstream(repoRoot);
			},
		);
	} finally {
		writeFileSync(adaptedFile, originalAdapted);
		writeFileSync(adaptedSumsPath, adaptedSums);
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
	const extraAdaptedPath = join(packageRoot, 'tests/upstream/extra-unlisted.test.ts');
	writeFileSync(extraAdaptedPath, "test('unlisted', () => {})\n");
	try {
		expectFailure('extra adapted upstream file', function extraAdaptedFile() {
			verifyReactResizablePanelsTestClassifications(repoRoot);
		});
	} finally {
		unlinkSync(extraAdaptedPath);
	}
	const userEventPath = join(packageRoot, 'tests/upstream/test/userEvent.ts');
	const originalUserEvent = readFileSync(userEventPath);
	const runtimeParityPath = join(packageRoot, 'audit/runtime-parity.json');
	const originalRuntimeParity = readFileSync(runtimeParityPath, 'utf8');
	// Decoy-preserving mutation: helpers hang in infinite loops whose apparent
	// breaks follow proven non-falling statements, while later arms retain every
	// constructor/dispatch token.
	const decoyUserEvent =
		"import { act } from '@octanejs/testing-library';\n" +
		'type PointerStep = {\n' +
		"\tkeys?: '[MouseLeft>]' | '[/MouseLeft]' | '[MouseRight>]' | '[/MouseRight]';\n" +
		'\tcoords?: { clientX: number; clientY: number };\n' +
		'};\n' +
		'async function pointer(steps: PointerStep[]): Promise<void> {\n' +
		'\twhile (true) { if (true) continue; break; }\n' +
		'\tconst type = "pointerdown";\n' +
		"\tact(() => document.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, buttons: 1, clientX: 0, clientY: 0, pointerId: 1, pointerType: 'mouse' })));\n" +
		"\tact(() => document.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, button: 2, clientX: 0, clientY: 0 })));\n" +
		'}\n' +
		'async function type(element: HTMLElement, text: string): Promise<void> {\n' +
		'\tfor (;;) { while (true) {} break; }\n' +
		"\tact(() => element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' })));\n" +
		'}\n' +
		'export default { pointer, type };\n';
	try {
		writeFileSync(userEventPath, decoyUserEvent);
		writeFileSync(adaptedSumsPath, renderReactResizablePanelsAdaptedInventory(repoRoot));
		// Refreshing the structural lock must not hide a decoy helper: reachable
		// construction→dispatch dataflow stays fail-closed.
		const decoyStructural = structuralSupportSource(decoyUserEvent, 'test/userEvent.ts', {});
		const decoyDigest = createHash('sha256').update(decoyStructural).digest('hex');
		const runtimeParity = JSON.parse(originalRuntimeParity);
		const lock = (runtimeParity.authoredSupportLocks ?? []).find(function findLock(entry) {
			return entry.path === 'test/userEvent.ts';
		});
		if (!lock) fail('Missing authoredSupportLocks entry for test/userEvent.ts');
		lock.structuralSha256 = decoyDigest;
		writeFileSync(runtimeParityPath, `${JSON.stringify(runtimeParity, null, 2)}\n`);
		expectFailure(
			'decoy authored user-event helper after regenerating adapted SHA list and structural lock',
			function decoyHelperAfterHashAndLockBlessing() {
				verifyReactResizablePanelsUpstream(repoRoot);
			},
		);
	} finally {
		writeFileSync(userEventPath, originalUserEvent);
		writeFileSync(adaptedSumsPath, adaptedSums);
		writeFileSync(runtimeParityPath, originalRuntimeParity);
	}
}

console.log(
	`Verified ${readFileSync(join(packageRoot, 'upstream/SHA256SUMS'), 'utf8').trim().split('\n').length} vendored files, ${expectedRuntime.length} runtime exports, ${expectedTypes.length} public types, ${upstream.upstreamCases} upstream registrations, ${upstream.portedCases} adapted registrations (${upstream.assertionGroups} assertion groups after ${upstream.permittedTransformations} permitted transforms), and ${classifications.tests} classified port tests.`,
);
