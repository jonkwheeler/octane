import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { buildTypeInventory } from './react-popper-types-lib.mjs';

async function fixture() {
	const root = await mkdtemp(join(tmpdir(), 'react-popper-types-'));
	const upstreamRoot = join(root, 'upstream');
	const adaptedRoot = join(root, 'adapted');
	await cp(
		new URL('../../packages/react-popper/upstream/tag/typings/tests', import.meta.url),
		upstreamRoot,
		{ recursive: true },
	);
	await cp(new URL('../../packages/react-popper/typetests', import.meta.url), adaptedRoot, {
		recursive: true,
	});
	await rm(join(adaptedRoot, 'tsconfig.adapted.json'), { force: true });
	await rm(join(adaptedRoot, 'tsconfig.pristine.json'), { force: true });
	await rm(join(adaptedRoot, 'public-api.test.ts'), { force: true });
	await rm(join(adaptedRoot, 'assertions.md'), { force: true });
	const expectError =
		'\n// @ts-expect-error placement must be a Popper placement\nvoid (null as any as { placement: "middle" });\n';
	for (const file of ['main-test.tsx', 'svg-test.tsx']) {
		await writeFile(
			join(upstreamRoot, file),
			`${await readFile(join(upstreamRoot, file), 'utf8')}${expectError}`,
		);
		await writeFile(
			join(adaptedRoot, file),
			`${await readFile(join(adaptedRoot, file), 'utf8')}${expectError}`,
		);
	}
	return {
		root,
		upstreamRoot,
		adaptedRoot,
		config: { upstreamRoot: 'upstream', adaptedRoot: 'adapted', adaptedOnly: [] },
	};
}

test('rejects a skipped adapted type-test file', async function rejectsSkippedFile(t) {
	const value = await fixture();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	await rm(join(value.adaptedRoot, 'main-test.tsx'));
	assert.throws(function run() {
		buildTypeInventory(value.root, value.config);
	}, /missing type-test file main-test\.tsx/);
});

test('rejects deleting an adapted assertion', async function rejectsDeletedAssertion(t) {
	const value = await fixture();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	const file = join(value.adaptedRoot, 'main-test.tsx');
	const source = await readFile(file, 'utf8');
	await writeFile(file, source.replace(/\n\/\/\s*@ts-expect-error[^\n]*\n[^\n]+\n/, '\n'));
	assert.throws(function run() {
		buildTypeInventory(value.root, value.config);
	}, /assertion groups differ/);
});

test('rejects removing an adapted @ts-expect-error', async function rejectsRemovedExpectError(t) {
	const value = await fixture();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	const file = join(value.adaptedRoot, 'main-test.tsx');
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
	const file = join(value.adaptedRoot, 'main-test.tsx');
	const source = await readFile(file, 'utf8');
	await writeFile(
		file,
		source.replace("from '@octanejs/react-popper'", "from '@octanejs/react-popper/missing'"),
	);
	assert.throws(function run() {
		buildTypeInventory(value.root, value.config);
	}, /change outside the permitted transformations/);
});
