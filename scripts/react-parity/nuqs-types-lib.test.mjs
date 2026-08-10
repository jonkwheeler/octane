import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { buildTypeInventory } from './nuqs-types-lib.mjs';

async function fixture() {
	const root = await mkdtemp(join(tmpdir(), 'nuqs-types-'));
	const upstreamRoot = join(root, 'upstream');
	const adaptedRoot = join(root, 'adapted');
	await cp(new URL('../../packages/nuqs/typetests/pristine', import.meta.url), upstreamRoot, {
		recursive: true,
	});
	await cp(
		new URL('../../packages/nuqs/typetests/public-api.test-d.ts', import.meta.url),
		join(adaptedRoot, 'public-api.test-d.ts'),
	);
	await rm(join(upstreamRoot, 'tsconfig.json'), { force: true });
	return {
		root,
		upstreamRoot,
		adaptedRoot,
		config: { upstreamRoot: 'upstream', adaptedRoot: 'adapted' },
	};
}

test('rejects a missing adapted type-test file', async function rejectsMissingFile(t) {
	const value = await fixture();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	await rm(join(value.adaptedRoot, 'public-api.test-d.ts'));
	assert.throws(function run() {
		buildTypeInventory(value.root, value.config);
	}, /every pristine type artifact/);
});

test('rejects deleting an adapted assertion', async function rejectsDeletedAssertion(t) {
	const value = await fixture();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	const file = join(value.adaptedRoot, 'public-api.test-d.ts');
	const source = await readFile(file, 'utf8');
	await writeFile(
		file,
		source.replace(/\ntype _IntegerExact = Assert<Equal<Integer, number>>;\n/, '\n'),
	);
	assert.throws(function run() {
		buildTypeInventory(value.root, value.config);
	}, /assertion groups differ/);
});

test('rejects removing an adapted @ts-expect-error', async function rejectsRemovedExpectError(t) {
	const value = await fixture();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	const file = join(value.adaptedRoot, 'public-api.test-d.ts');
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
	const file = join(value.adaptedRoot, 'public-api.test-d.ts');
	const source = await readFile(file, 'utf8');
	await writeFile(file, source.replace("from '@octanejs/nuqs'", "from '@octanejs/nuqs/server'"));
	assert.throws(function run() {
		buildTypeInventory(value.root, value.config);
	}, /change outside the permitted transformations/);
});
