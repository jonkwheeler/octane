import { createHash } from 'node:crypto';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
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

function fail(message) {
	throw new Error(message);
}

function verifyApi(
	api = JSON.parse(readFileSync(join(packageRoot, 'audit/public-api.json'), 'utf8')),
) {
	if (JSON.stringify([...api.runtime].sort()) !== JSON.stringify(expectedRuntime))
		fail('Runtime export inventory drift');
	if (JSON.stringify([...api.types].sort()) !== JSON.stringify(expectedTypes))
		fail('Public type inventory drift');
	const sourceIndex = readFileSync(join(packageRoot, 'upstream/lib/index.ts'), 'utf8');
	for (const name of [...expectedRuntime, ...expectedTypes]) {
		if (!new RegExp(`\\b${name}\\b`).test(sourceIndex))
			fail(`Upstream index no longer exports ${name}`);
	}
	const declaration = readFileSync(
		join(packageRoot, 'upstream-artifact/dist/react-resizable-panels.d.ts'),
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

verifyApi();
const upstream = verifyReactResizablePanelsUpstream(repoRoot);
const classifications = verifyReactResizablePanelsTestClassifications(repoRoot);

if (process.argv.includes('--negative-controls')) {
	const api = JSON.parse(readFileSync(join(packageRoot, 'audit/public-api.json'), 'utf8'));
	expectFailure('missing runtime export', function missingRuntime() {
		verifyApi({ ...api, runtime: api.runtime.slice(1) });
	});
	expectFailure('extra public type', function extraType() {
		verifyApi({ ...api, types: [...api.types, 'WeakenedType'] });
	});
	const adaptedFile = join(packageRoot, 'tests/upstream/hooks/useId.test.ts');
	const originalAdapted = readFileSync(adaptedFile);
	const weakenedAdapted = `${originalAdapted.toString('utf8').replace(/\n\s*expect\([^;]+;/, '\n')}`;
	try {
		writeFileSync(adaptedFile, weakenedAdapted);
		expectFailure('deleted adapted assertion body', function deletedAssertion() {
			verifyReactResizablePanelsUpstream(repoRoot);
		});
	} finally {
		writeFileSync(adaptedFile, originalAdapted);
	}
	const extraAdaptedPath = join(packageRoot, 'tests/upstream/extra-unlisted.test.ts');
	writeFileSync(extraAdaptedPath, "test('unlisted', () => {})\n");
	try {
		expectFailure('extra adapted upstream file', function extraAdaptedFile() {
			verifyReactResizablePanelsTestClassifications(repoRoot);
		});
	} finally {
		unlinkSync(extraAdaptedPath);
	}
	const userEventPath = join(packageRoot, 'tests/support/userEvent.ts');
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
		// Refreshing the structural lock must not hide a decoy helper: reachable
		// construction→dispatch dataflow stays fail-closed.
		const decoyStructural = structuralSupportSource(decoyUserEvent, '../support/userEvent.ts', {});
		const decoyDigest = createHash('sha256').update(decoyStructural).digest('hex');
		const runtimeParity = JSON.parse(originalRuntimeParity);
		const lock = (runtimeParity.authoredSupportLocks ?? []).find(function findLock(entry) {
			return entry.path === '../support/userEvent.ts';
		});
		if (!lock) fail('Missing authoredSupportLocks entry for ../support/userEvent.ts');
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
		writeFileSync(runtimeParityPath, originalRuntimeParity);
	}
}

console.log(
	`Verified ${JSON.parse(readFileSync(join(packageRoot, 'audit/upstream.lock.json'), 'utf8')).files.length} lock-pinned files, ${expectedRuntime.length} runtime exports, ${expectedTypes.length} public types, ${upstream.upstreamCases} upstream registrations, ${upstream.portedCases} adapted registrations (${upstream.assertionGroups} assertion groups after ${upstream.permittedTransformations} permitted transforms), and ${classifications.tests} classified port tests.`,
);
