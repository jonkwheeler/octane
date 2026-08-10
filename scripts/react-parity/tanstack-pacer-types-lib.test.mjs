import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
	buildTypeInventory,
	readTypeParityConfig,
	verifyTanstackPacerTypes,
} from './tanstack-pacer-types-lib.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

async function fixture() {
	const root = await mkdtemp(join(tmpdir(), 'tanstack-pacer-types-'));
	const upstreamRoot = join(root, 'upstream');
	const adaptedRoot = join(root, 'adapted');
	const auditRoot = join(root, 'audit');
	await cp(join(REPO, 'packages/tanstack-pacer/upstream/package/src'), upstreamRoot, {
		recursive: true,
	});
	await cp(join(REPO, 'packages/tanstack-pacer/src'), adaptedRoot, {
		recursive: true,
	});
	await mkdir(auditRoot, { recursive: true });
	const config = readTypeParityConfig(REPO, 'packages/tanstack-pacer/audit/type-parity.json');
	const localConfig = {
		...config,
		upstreamRoot: 'upstream',
		adaptedRoot: 'adapted',
		inventories: {
			pristine: 'audit/upstream-types.json',
			adapted: 'audit/adapted-types.json',
		},
	};
	const inventory = buildTypeInventory(root, localConfig);
	await writeFile(
		join(auditRoot, 'upstream-types.json'),
		`${JSON.stringify(inventory.upstream, null, '\t')}\n`,
	);
	await writeFile(
		join(auditRoot, 'adapted-types.json'),
		`${JSON.stringify(inventory.adapted, null, '\t')}\n`,
	);
	await writeFile(join(root, 'type-parity.json'), `${JSON.stringify(localConfig, null, '\t')}\n`);
	return { root, config: localConfig };
}

test('rejects a skipped adapted source file', async (t) => {
	const value = await fixture();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	await rm(join(value.root, 'adapted/debouncer/useDebouncer.ts'));
	assert.throws(function missing() {
		buildTypeInventory(value.root, value.config);
	}, /missing:.*useDebouncer/);
});

test('rejects an unauthorized structural change', async (t) => {
	const value = await fixture();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	const file = join(value.root, 'adapted/debouncer/useDebouncer.ts');
	const source = await readFile(file, 'utf8');
	await writeFile(file, `${source}\nexport const __unauthorizedDrift = true;\n`);
	assert.throws(function unauthorized() {
		buildTypeInventory(value.root, value.config);
	}, /outside the permitted transformations/);
});

test('rejects deleting an adapted assertion group', async (t) => {
	const value = await fixture();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	const file = join(value.root, 'adapted/internal.ts');
	const source = await readFile(file, 'utf8');
	assert.match(source, /OCTANE DIVERGENCE/);
	await writeFile(
		file,
		source.replace(/\/\/ OCTANE DIVERGENCE\[[^\]]+\]\[[^\]]+\]\n(?:\/\/[^\n]*\n)*/, ''),
	);
	assert.throws(function drifted() {
		verifyTanstackPacerTypes(value.root, { configPath: 'type-parity.json' });
	}, /adapted type inventory drifted/);
});

test('rejects removing an adapted @ts-expect-error', async (t) => {
	const value = await fixture();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	const adaptedFile = join(value.root, 'adapted/debouncer/useDebouncer.ts');
	const upstreamFile = join(value.root, 'upstream/debouncer/useDebouncer.ts');
	const adaptedSource = await readFile(adaptedFile, 'utf8');
	const upstreamSource = await readFile(upstreamFile, 'utf8');
	const marker =
		'\n// @ts-expect-error control fixture\nconst __control: string = 1 as unknown as string;\n';
	await writeFile(adaptedFile, `${adaptedSource}${marker}`);
	await writeFile(upstreamFile, `${upstreamSource}${marker}`);
	const inventory = buildTypeInventory(value.root, value.config);
	await writeFile(
		join(value.root, 'audit/adapted-types.json'),
		`${JSON.stringify(inventory.adapted, null, '\t')}\n`,
	);
	await writeFile(
		join(value.root, 'audit/upstream-types.json'),
		`${JSON.stringify(inventory.upstream, null, '\t')}\n`,
	);
	await writeFile(
		adaptedFile,
		`${adaptedSource}${marker}`.replace(/\s*\/\/\s*@ts-expect-error[^\n]*\n/, '\n'),
	);
	assert.throws(function removed() {
		verifyTanstackPacerTypes(value.root, { configPath: 'type-parity.json' });
	}, /adapted type inventory drifted/);
});

test('path maps cover the complete upstream source suite under enforced transforms', () => {
	const config = readTypeParityConfig(REPO);
	const inventory = buildTypeInventory(REPO, config);
	assert.equal(inventory.upstream.length, 43);
	assert.equal(inventory.adapted.length, 45);
	assert.ok(
		inventory.adapted.some(function find(entry) {
			return entry.path === 'internal.ts' && entry.assertionGroups.length > 0;
		}),
	);
});
