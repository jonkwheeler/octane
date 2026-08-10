import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { buildTypeInventories } from './tanstack-devtools-types-lib.mjs';

async function fixture() {
	const root = await mkdtemp(join(tmpdir(), 'tanstack-devtools-types-'));
	await mkdir(join(root, 'packages/tanstack-devtools/audit'), { recursive: true });
	await cp(
		new URL('../../packages/tanstack-devtools/upstream/package/src', import.meta.url),
		join(root, 'packages/tanstack-devtools/upstream/package/src'),
		{ recursive: true },
	);
	await cp(
		new URL('../../packages/tanstack-devtools/src', import.meta.url),
		join(root, 'packages/tanstack-devtools/src'),
		{ recursive: true },
	);
	await cp(
		new URL('../../packages/tanstack-devtools/audit/type-probes', import.meta.url),
		join(root, 'packages/tanstack-devtools/audit/type-probes'),
		{ recursive: true },
	);
	await cp(
		new URL('../../packages/tanstack-devtools/typetests', import.meta.url),
		join(root, 'packages/tanstack-devtools/typetests'),
		{ recursive: true },
	);
	await rm(join(root, 'packages/tanstack-devtools/typetests/pristine'), {
		recursive: true,
		force: true,
	});
	await rm(join(root, 'packages/tanstack-devtools/typetests/adapted'), {
		recursive: true,
		force: true,
	});
	const config = JSON.parse(
		await readFile(
			new URL('../../packages/tanstack-devtools/audit/type-parity.json', import.meta.url),
			'utf8',
		),
	);
	await writeFile(
		join(root, 'packages/tanstack-devtools/audit/type-parity.json'),
		`${JSON.stringify(config, null, '\t')}\n`,
	);
	return { root };
}

test('rejects a skipped adapted source-program file', async function rejectsSkippedSource(t) {
	const value = await fixture();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	await rm(join(value.root, 'packages/tanstack-devtools/src/devtools.tsrx'));
	assert.throws(function run() {
		buildTypeInventories(value.root);
	}, /adapted source program membership drifted/);
});

test('rejects an unmapped adapted source file', async function rejectsUnmappedSource(t) {
	const value = await fixture();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	await writeFile(
		join(value.root, 'packages/tanstack-devtools/src/extra.ts'),
		'export const orphan = 1;\n',
	);
	assert.throws(function run() {
		buildTypeInventories(value.root);
	}, /adapted source program membership drifted/);
});

test('rejects deleting a required adapted export', async function rejectsMissingExport(t) {
	const value = await fixture();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	const file = join(value.root, 'packages/tanstack-devtools/src/index.ts');
	const source = await readFile(file, 'utf8');
	await writeFile(
		file,
		source.replace(
			"export type { TanStackDevtoolsOctanePlugin, TanStackDevtoolsOctaneInit } from './devtools.tsrx';\n",
			'',
		),
	);
	assert.throws(function run() {
		buildTypeInventories(value.root);
	}, /missing required exports/);
});

test('rejects an undeclared adapted extra export', async function rejectsUndeclaredExtra(t) {
	const value = await fixture();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	const file = join(value.root, 'packages/tanstack-devtools/src/index.ts');
	const source = await readFile(file, 'utf8');
	await writeFile(file, `${source}\nexport const surprise = true;\n`);
	assert.throws(function run() {
		buildTypeInventories(value.root);
	}, /undeclared extra exports/);
});

test('rejects a skipped adapted type-probe file', async function rejectsSkippedProbe(t) {
	const value = await fixture();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	await rm(join(value.root, 'packages/tanstack-devtools/typetests/public-api.test-d.ts'));
	assert.throws(function run() {
		buildTypeInventories(value.root);
	}, /every upstream probe needs one adapted counterpart/);
});

test('rejects deleting an adapted probe assertion', async function rejectsDeletedAssertion(t) {
	const value = await fixture();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	const file = join(value.root, 'packages/tanstack-devtools/typetests/public-api.test-d.ts');
	const source = await readFile(file, 'utf8');
	await writeFile(
		file,
		source.replace(/\nexpectType<typeof TanStackDevtools>\(TanStackDevtools\);/, ''),
	);
	assert.throws(function run() {
		buildTypeInventories(value.root);
	}, /assertion groups differ/);
});

test('rejects removing an adapted probe @ts-expect-error', async function rejectsRemovedExpectError(t) {
	const value = await fixture();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	const file = join(value.root, 'packages/tanstack-devtools/typetests/public-api.test-d.ts');
	const source = await readFile(file, 'utf8');
	assert.equal(source.includes('@ts-expect-error'), true, 'fixture must contain @ts-expect-error');
	await writeFile(file, source.replace(/\s*\/\/\s*@ts-expect-error[^\n]*\n/, '\n'));
	assert.throws(function run() {
		buildTypeInventories(value.root);
	}, /assertion groups differ/);
});

test('rejects retargeting an adapted public probe import', async function rejectsRetargetedImport(t) {
	const value = await fixture();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	const file = join(value.root, 'packages/tanstack-devtools/typetests/public-api.test-d.ts');
	const source = await readFile(file, 'utf8');
	await writeFile(file, source.replace("from '../src/index'", "from '../src/devtools.tsrx'"));
	assert.throws(function run() {
		buildTypeInventories(value.root);
	}, /change outside the permitted transformations/);
});
