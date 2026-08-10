import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { buildTypeInventories } from './tanstack-devtools-types-lib.mjs';

async function fixture() {
	const root = await mkdtemp(join(tmpdir(), 'tanstack-devtools-types-'));
	const upstreamRoot = join(root, 'upstream');
	const adaptedRoot = join(root, 'adapted');
	await cp(
		new URL('../../packages/tanstack-devtools/audit/type-probes', import.meta.url),
		upstreamRoot,
		{ recursive: true },
	);
	await cp(new URL('../../packages/tanstack-devtools/typetests', import.meta.url), adaptedRoot, {
		recursive: true,
	});
	await rm(join(upstreamRoot, 'tsconfig.pristine.json'), { force: true });
	await rm(join(adaptedRoot, 'tsconfig.json'), { force: true });
	await mkdir(join(root, 'packages/tanstack-devtools/audit'), { recursive: true });
	await writeFile(
		join(root, 'packages/tanstack-devtools/audit/type-parity.json'),
		JSON.stringify({
			schemaVersion: 1,
			upstreamRoot: 'upstream',
			adaptedRoot: 'adapted',
			inventories: {
				upstream: 'upstream-types.json',
				adapted: 'adapted-types.json',
			},
		}),
	);
	return { root, upstreamRoot, adaptedRoot };
}

test('rejects a skipped adapted type-test file', async function rejectsSkippedFile(t) {
	const value = await fixture();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	await rm(join(value.adaptedRoot, 'public-api.test-d.ts'));
	assert.throws(function run() {
		buildTypeInventories(value.root);
	}, /every upstream type artifact/);
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
		source.replace(/\nexpectType<typeof TanStackDevtools>\(TanStackDevtools\);/, ''),
	);
	assert.throws(function run() {
		buildTypeInventories(value.root);
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
		buildTypeInventories(value.root);
	}, /assertion groups differ/);
});

test('rejects retargeting an adapted public import', async function rejectsRetargetedImport(t) {
	const value = await fixture();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	const file = join(value.adaptedRoot, 'public-api.test-d.ts');
	const source = await readFile(file, 'utf8');
	await writeFile(file, source.replace("from '../src/index'", "from '../src/devtools.tsrx'"));
	assert.throws(function run() {
		buildTypeInventories(value.root);
	}, /change outside the permitted transformations/);
});
