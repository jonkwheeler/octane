import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { buildTypeInventory } from './solana-react-types-lib.mjs';

async function fixture() {
	const root = await mkdtemp(join(tmpdir(), 'solana-react-types-'));
	const upstreamRoot = join(root, 'upstream');
	const adaptedRoot = join(root, 'adapted');
	await cp(new URL('../../packages/solana-react/upstream/src', import.meta.url), upstreamRoot, {
		recursive: true,
	});
	await cp(new URL('../../packages/solana-react/typetests', import.meta.url), adaptedRoot, {
		recursive: true,
	});
	return {
		root,
		upstreamRoot,
		adaptedRoot,
		config: { upstreamRoot: 'upstream', adaptedRoot: 'adapted' },
	};
}

test('rejects a skipped adapted type-test file', async (t) => {
	const value = await fixture();
	t.after(() => rm(value.root, { recursive: true, force: true }));
	await rm(join(value.adaptedRoot, '__typetests__/useClient-typetest.ts'));
	assert.throws(() => buildTypeInventory(value.root, value.config), /missing:.*useClient-typetest/);
});

test('rejects deleting an adapted assertion', async (t) => {
	const value = await fixture();
	t.after(() => rm(value.root, { recursive: true, force: true }));
	const file = join(value.adaptedRoot, '__typetests__/useClient-typetest.ts');
	const source = await readFile(file, 'utf8');
	await writeFile(file, source.replace(/\n\s*client\.foo\.hello\(\) satisfies string;/, '\n'));
	assert.throws(
		() => buildTypeInventory(value.root, value.config),
		/assertion groups differ|permitted transformations/,
	);
});

test('rejects removing an adapted @ts-expect-error', async (t) => {
	const value = await fixture();
	t.after(() => rm(value.root, { recursive: true, force: true }));
	const file = join(value.adaptedRoot, '__typetests__/useClient-typetest.ts');
	const source = await readFile(file, 'utf8');
	assert.match(source, /@ts-expect-error/);
	await writeFile(file, source.replace(/\s*\/\/\s*@ts-expect-error[^\n]*\n/, '\n'));
	assert.throws(() => buildTypeInventory(value.root, value.config), /assertion groups differ/);
});

test('rejects retargeting an adapted relative import', async (t) => {
	const value = await fixture();
	t.after(() => rm(value.root, { recursive: true, force: true }));
	const file = join(value.adaptedRoot, '__typetests__/useClient-typetest.ts');
	const source = await readFile(file, 'utf8');
	await writeFile(
		file,
		source.replace("from '../../src/hooks/useClient'", "from '../../src/index'"),
	);
	assert.throws(
		() => buildTypeInventory(value.root, value.config),
		/change outside the permitted transformations/,
	);
});
