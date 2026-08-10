import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile, cp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
	dropAdaptedFixture,
	omitAdaptedIdentity,
	renameAdaptedIdentity,
	verifyTiptapRuntimeCrosswalk,
} from './tiptap-runtime-lib.mjs';

const REPO = fileURLToPath(new URL('../..', import.meta.url));

async function fixtureRoot() {
	const root = await mkdtemp(join(tmpdir(), 'tiptap-runtime-'));
	await mkdir(join(root, 'packages/tiptap/audit'), { recursive: true });
	await mkdir(join(root, 'packages/tiptap/upstream/src/menus'), { recursive: true });
	await mkdir(join(root, 'packages/tiptap/tests/upstream'), { recursive: true });
	for (const file of [
		'packages/tiptap/audit/pristine-runtime.json',
		'packages/tiptap/audit/adapted-runtime.json',
		'packages/tiptap/audit/react-parity.json',
		'packages/tiptap/UPSTREAM.md',
	]) {
		await cp(join(REPO, file), join(root, file));
	}
	const pristine = JSON.parse(
		await readFile(join(root, 'packages/tiptap/audit/pristine-runtime.json'), 'utf8'),
	);
	const adapted = JSON.parse(
		await readFile(join(root, 'packages/tiptap/audit/adapted-runtime.json'), 'utf8'),
	);
	for (const relativePath of [...(pristine.files ?? []), ...(adapted.files ?? [])]) {
		const absolute = join(root, relativePath);
		await mkdir(join(absolute, '..'), { recursive: true });
		await writeFile(absolute, '// fixture\n');
	}
	return root;
}

test('tiptap runtime crosswalk accepts the committed inventories', function acceptsCommitted() {
	assert.deepEqual(verifyTiptapRuntimeCrosswalk(REPO), {
		identities: 7,
		pristineFiles: 4,
		adaptedFiles: 4,
	});
});

test('omitting an adapted identity fails the crosswalk', async function omitsIdentity(t) {
	const root = await fixtureRoot();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	const path = join(root, 'packages/tiptap/audit/adapted-runtime.json');
	const adapted = JSON.parse(await readFile(path, 'utf8'));
	await writeFile(path, `${JSON.stringify(omitAdaptedIdentity(adapted), null, 2)}\n`);
	assert.throws(function run() {
		verifyTiptapRuntimeCrosswalk(root);
	}, /differ in length|omitted pristine identities/);
});

test('renaming an adapted identity fails the crosswalk', async function renamesIdentity(t) {
	const root = await fixtureRoot();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	const path = join(root, 'packages/tiptap/audit/adapted-runtime.json');
	const adapted = JSON.parse(await readFile(path, 'utf8'));
	await writeFile(path, `${JSON.stringify(renameAdaptedIdentity(adapted), null, 2)}\n`);
	assert.throws(function run() {
		verifyTiptapRuntimeCrosswalk(root);
	}, /omitted pristine identities|absent from pristine/);
});

test('dropping an adapted fixture path fails the crosswalk', async function dropsFixture(t) {
	const root = await fixtureRoot();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	const path = join(root, 'packages/tiptap/audit/adapted-runtime.json');
	const adapted = JSON.parse(await readFile(path, 'utf8'));
	const mutated = dropAdaptedFixture(adapted);
	await writeFile(path, `${JSON.stringify(mutated, null, 2)}\n`);
	assert.throws(function run() {
		verifyTiptapRuntimeCrosswalk(root);
	}, /missing adapted evidence citation|missing fixture|drifted from UPSTREAM/);
});

test('deleting an on-disk adapted fixture fails the crosswalk', async function deletesFixture(t) {
	const root = await fixtureRoot();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	const adapted = JSON.parse(
		await readFile(join(root, 'packages/tiptap/audit/adapted-runtime.json'), 'utf8'),
	);
	await rm(join(root, adapted.files[0]));
	assert.throws(function run() {
		verifyTiptapRuntimeCrosswalk(root);
	}, /missing fixture/);
});
