import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { verifyWaypointNodeCrosswalk } from './waypoint-runtime-crosswalk-lib.mjs';

async function fixture() {
	const root = await mkdtemp(join(tmpdir(), 'waypoint-node-crosswalk-'));
	await mkdir(join(root, 'packages/waypoint/audit'), { recursive: true });
	for (const file of ['pristine-runtime.json', 'adapted-runtime.json']) {
		await cp(
			new URL(`../../packages/waypoint/audit/${file}`, import.meta.url),
			join(root, `packages/waypoint/audit/${file}`),
		);
	}
	return root;
}

async function readAdapted(root) {
	const path = join(root, 'packages/waypoint/audit/adapted-runtime.json');
	return {
		path,
		inventory: JSON.parse(await readFile(path, 'utf8')),
	};
}

test('accepts the committed pristine/adapted node inventories', async function acceptsCommitted(t) {
	const root = await fixture();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	assert.deepEqual(verifyWaypointNodeCrosswalk(root), { titles: 8 });
});

test('rejects dropping one adapted entry', async function rejectsDroppedAdapted(t) {
	const root = await fixture();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	const { path, inventory } = await readAdapted(root);
	assert.ok(inventory.tests.length > 1, 'adapted inventory must contain multiple identities');
	inventory.tests = inventory.tests.slice(1);
	await writeFile(path, `${JSON.stringify(inventory, null, '\t')}\n`);
	assert.throws(function run() {
		verifyWaypointNodeCrosswalk(root);
	}, /missing adapted titles/);
});

test('rejects renaming an adapted fullName', async function rejectsRenamedFullName(t) {
	const root = await fixture();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	const { path, inventory } = await readAdapted(root);
	inventory.tests[0] = {
		...inventory.tests[0],
		fullName: `${inventory.tests[0].fullName} (renamed)`,
	};
	await writeFile(path, `${JSON.stringify(inventory, null, '\t')}\n`);
	assert.throws(function run() {
		verifyWaypointNodeCrosswalk(root);
	}, /not one-for-one by title/);
});

test('rejects a duplicate adapted title', async function rejectsDuplicateAdaptedTitle(t) {
	const root = await fixture();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	const { path, inventory } = await readAdapted(root);
	assert.ok(inventory.tests.length > 1, 'adapted inventory must contain multiple identities');
	inventory.tests[1] = {
		...inventory.tests[1],
		fullName: inventory.tests[0].fullName,
	};
	await writeFile(path, `${JSON.stringify(inventory, null, '\t')}\n`);
	assert.throws(function run() {
		verifyWaypointNodeCrosswalk(root);
	}, /duplicate adapted title/);
});
