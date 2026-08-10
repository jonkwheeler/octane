import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
	TYPE_PARITY_CONFIG,
	buildTypeInventory,
	verifyTanstackStoreTypes,
} from './tanstack-store-types-lib.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

async function fixture() {
	const root = await mkdtemp(join(tmpdir(), 'tanstack-store-types-'));
	const upstreamRoot = join(root, 'upstream');
	const adaptedRoot = join(root, 'adapted');
	await cp(join(REPO, 'packages/tanstack-store/upstream/tests'), upstreamRoot, {
		recursive: true,
	});
	await cp(join(REPO, 'packages/tanstack-store/typetests'), adaptedRoot, {
		recursive: true,
	});
	await rm(join(adaptedRoot, 'tsconfig.json'), { force: true });
	await rm(join(adaptedRoot, '_useStore-omission.test-d.ts'), { force: true });
	return {
		root,
		upstreamRoot,
		adaptedRoot,
		config: {
			upstreamRoot: 'upstream',
			adaptedRoot: 'adapted',
			file: 'test.test-d.ts',
			inventories: {
				upstream: 'pristine-types.json',
				adapted: 'adapted-types.json',
			},
		},
	};
}

test('committed tanstack-store type inventories verify', function committedInventoriesVerify() {
	assert.deepEqual(verifyTanstackStoreTypes(REPO, { configPath: TYPE_PARITY_CONFIG }), {
		files: 1,
		assertions: 2,
	});
});

test('assertion group compare ignores @ts-expect-error inside pristine-only _useStore blocks', async function ignoresOmittedExpectError(t) {
	const value = await fixture();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	const upstreamFile = join(value.upstreamRoot, 'test.test-d.ts');
	const source = await readFile(upstreamFile, 'utf8');
	assert.match(source, /test\('_useStore returns setState for plain stores'/);
	const mutated = source.replace(
		'const [selected, setState] = _useStore(store, (state) => state)',
		[
			'// @ts-expect-error intentional pristine-only control',
			'  const [selected, setState] = _useStore(store, (state) => state)',
		].join('\n  '),
	);
	assert.notEqual(mutated, source);
	await writeFile(upstreamFile, mutated);
	assert.doesNotThrow(function run() {
		buildTypeInventory(value.root, value.config);
	});
});

test('assertion group compare still rejects adapted @ts-expect-error drift', async function rejectsAdaptedExpectErrorDrift(t) {
	const value = await fixture();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	const adaptedFile = join(value.adaptedRoot, 'test.test-d.ts');
	const source = await readFile(adaptedFile, 'utf8');
	assert.equal(source.includes('@ts-expect-error'), true);
	await writeFile(adaptedFile, source.replace(/\s*\/\/\s*@ts-expect-error[^\n]*\n/, '\n'));
	assert.throws(function run() {
		buildTypeInventory(value.root, value.config);
	}, /assertion groups differ/);
});

test('config still documents the intentional _useStore omission', function documentsOmission() {
	const config = JSON.parse(readFileSync(join(REPO, TYPE_PARITY_CONFIG), 'utf8'));
	assert.ok(
		config.permittedTransformations.some(function isOmission(entry) {
			return entry.kind === 'intentional-omission';
		}),
	);
});
