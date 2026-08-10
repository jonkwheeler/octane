import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { buildTypeInventory, readTypeParityConfig } from './react-transition-group-types-lib.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

async function fixture() {
	const root = await mkdtemp(join(tmpdir(), 'react-transition-group-types-'));
	await cp(
		new URL('../../packages/react-transition-group/typetests', import.meta.url),
		join(root, 'typetests'),
		{ recursive: true },
	);
	const config = {
		pairs: [
			{
				upstream: 'typetests/upstream.ts',
				adapted: 'typetests/local.ts',
			},
		],
		inventories: {
			upstream: 'upstream-types.json',
			adapted: 'local-types.json',
		},
	};
	return { root, config };
}

test('accepts the committed react-transition-group type pair', function acceptsCommitted() {
	const config = readTypeParityConfig(REPO);
	assert.equal(buildTypeInventory(REPO, config).upstream.length, 1);
});

test('rejects a skipped adapted type-test file', async function rejectsSkippedFile(t) {
	const value = await fixture();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	await rm(join(value.root, 'typetests/local.ts'));
	assert.throws(function run() {
		buildTypeInventory(value.root, value.config);
	}, /missing adapted type fixture/);
});

test('rejects deleting an adapted assertion', async function rejectsDeletedAssertion(t) {
	const value = await fixture();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	const file = join(value.root, 'typetests/local.ts');
	const source = await readFile(file, 'utf8');
	await writeFile(file, source.replace(/\nvoid switchComponent;\n/, '\n'));
	assert.throws(function run() {
		buildTypeInventory(value.root, value.config);
	}, /assertion groups differ/);
});

test('rejects removing an adapted @ts-expect-error', async function rejectsRemovedExpectError(t) {
	const value = await fixture();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	const file = join(value.root, 'typetests/local.ts');
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
	const file = join(value.root, 'typetests/local.ts');
	const source = await readFile(file, 'utf8');
	await writeFile(file, source.replace("from '../src/index'", "from '../src/config'"));
	assert.throws(function run() {
		buildTypeInventory(value.root, value.config);
	}, /change outside the permitted transformations/);
});
