import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import {
	buildProgramInventory,
	buildTypeInventory,
	readTypeParityConfig,
	verifyReactColorfulTypes,
} from './react-colorful-types-lib.mjs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

async function fixture() {
	const root = await mkdtemp(join(tmpdir(), 'react-colorful-types-'));
	const upstreamRoot = join(root, 'upstream');
	const adaptedRoot = join(root, 'adapted');
	await cp(
		new URL('../../packages/react-colorful/audit/type-probes', import.meta.url),
		upstreamRoot,
		{ recursive: true },
	);
	await cp(new URL('../../packages/react-colorful/typetests', import.meta.url), adaptedRoot, {
		recursive: true,
	});
	await rm(join(upstreamRoot, 'tsconfig.pristine.json'), { force: true });
	await rm(join(adaptedRoot, 'tsconfig.adapted.json'), { force: true });
	await rm(join(adaptedRoot, 'tsconfig.pristine.json'), { force: true });
	return {
		root,
		upstreamRoot,
		adaptedRoot,
		config: { upstreamRoot: 'upstream', adaptedRoot: 'adapted' },
	};
}

test('rejects a skipped adapted type-test file', async function rejectsSkippedFile(t) {
	const value = await fixture();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	await rm(join(value.adaptedRoot, 'public-api.test.ts'));
	assert.throws(function run() {
		buildTypeInventory(value.root, value.config);
	}, /every upstream type artifact/);
});

test('rejects deleting an adapted assertion', async function rejectsDeletedAssertion(t) {
	const value = await fixture();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	const file = join(value.adaptedRoot, 'public-api.test.ts');
	const source = await readFile(file, 'utf8');
	await writeFile(file, source.replace(/\nsetNonce\('nonce'\);/, '\n'));
	assert.throws(function run() {
		buildTypeInventory(value.root, value.config);
	}, /assertion groups differ|permitted transformations/);
});

test('rejects removing an adapted @ts-expect-error', async function rejectsRemovedExpectError(t) {
	const value = await fixture();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	const file = join(value.adaptedRoot, 'public-api.test.ts');
	const source = await readFile(file, 'utf8');
	assert.equal(source.includes('@ts-expect-error'), true, 'fixture must contain @ts-expect-error');
	await writeFile(file, source.replace(/\s*\/\/\s*@ts-expect-error[^\n]*\n/, '\n'));
	assert.throws(function run() {
		buildTypeInventory(value.root, value.config);
	}, /assertion groups differ/);
});

test('rejects retargeting an adapted public import', async function rejectsRetargetedImport(t) {
	const value = await fixture();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	const file = join(value.adaptedRoot, 'public-api.test.ts');
	const source = await readFile(file, 'utf8');
	await writeFile(file, source.replace("from '@octanejs/react-colorful'", "from '../src/index'"));
	assert.throws(function run() {
		buildTypeInventory(value.root, value.config);
	}, /change outside the permitted transformations/);
});

test('rejects dropping the host-event expectType proof', async function rejectsDroppedEventProof(t) {
	const value = await fixture();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	const file = join(value.adaptedRoot, 'public-api.test.ts');
	const source = await readFile(file, 'utf8');
	await writeFile(
		file,
		source.replace(
			/type HexColorInputOnInput[\s\S]*?expectType<HostInputEvent>\([\s\S]*?\);\n/,
			'',
		),
	);
	assert.throws(function run() {
		buildTypeInventory(value.root, value.config);
	}, /assertion groups differ|permitted transformations/);
});

test('program dispositions cover every upstream and adapted source file', function coversPrograms() {
	const config = readTypeParityConfig(REPO);
	const inventory = buildProgramInventory(REPO, config);
	assert.equal(inventory.upstream.length, 38);
	assert.equal(inventory.adapted.length, 37);
});

test('fails closed when an upstream program file loses its disposition', function rejectsMissingDisposition() {
	const config = readTypeParityConfig(REPO);
	const broken = structuredClone(config);
	broken.fileDispositions = broken.fileDispositions.filter(function keep(entry) {
		return entry.path !== 'types.ts';
	});
	assert.throws(function run() {
		buildProgramInventory(REPO, broken);
	}, /missing type disposition for upstream program file types\.ts/);
});

test('fails closed when an adapted program file is unmapped', function rejectsUnmappedAdapted() {
	const config = readTypeParityConfig(REPO);
	const broken = structuredClone(config);
	const cssDecl = broken.fileDispositions.find(function find(entry) {
		return entry.path === 'css/styles.css.d.ts';
	});
	cssDecl.adaptedEvidence = [];
	assert.throws(function run() {
		buildProgramInventory(REPO, broken);
	}, /adapted program file css\/styles\.ts is not covered/);
});

test('type-parity records the native-event divergence and validates against pinned inventories', function validatesLive() {
	const result = verifyReactColorfulTypes(REPO);
	assert.equal(result.files, 1);
	assert.ok(result.assertions >= 5);
	assert.equal(result.programFiles.upstream, 38);
	assert.equal(result.programFiles.adapted, 37);
});
