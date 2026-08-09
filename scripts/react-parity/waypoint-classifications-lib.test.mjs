import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { verifyWaypointTestClassifications } from './waypoint-classifications-lib.mjs';

async function fixture() {
	const root = await mkdtemp(join(tmpdir(), 'waypoint-classifications-'));
	await cp(
		new URL('../../packages/waypoint/tests', import.meta.url),
		join(root, 'packages/waypoint/tests'),
		{ recursive: true },
	);
	for (const file of ['test-classifications.json', 'react-parity.json']) {
		await cp(
			new URL(`../../packages/waypoint/audit/${file}`, import.meta.url),
			join(root, `packages/waypoint/audit/${file}`),
			{ recursive: true },
		);
	}
	return root;
}

test('rejects an unclassified port-authored test', async function rejectsUnclassified(t) {
	const root = await fixture();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	await writeFile(join(root, 'packages/waypoint/tests/new.test.ts'), 'export {};\n');
	assert.throws(function run() {
		verifyWaypointTestClassifications(root);
	}, /exactly one classification/);
});

test('rejects a parity classification without an oracle', async function rejectsMissingOracle(t) {
	const root = await fixture();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	const path = join(root, 'packages/waypoint/audit/test-classifications.json');
	const config = JSON.parse(await readFile(path, 'utf8'));
	delete config.tests.find(function findAdapted(entry) {
		return entry.disposition === 'adapted-upstream-suite';
	}).oracle;
	await writeFile(path, `${JSON.stringify(config)}\n`);
	assert.throws(function run() {
		verifyWaypointTestClassifications(root);
	}, /requires a React oracle/);
});

test('rejects an Octane-only classification that claims an oracle', async function rejectsOracle(t) {
	const root = await fixture();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	const path = join(root, 'packages/waypoint/audit/test-classifications.json');
	const config = JSON.parse(await readFile(path, 'utf8'));
	config.tests.find(function findOctaneOnly(entry) {
		return entry.disposition === 'octane-only-framework-contract';
	}).oracle = 'must not claim parity';
	await writeFile(path, `${JSON.stringify(config)}\n`);
	assert.throws(function run() {
		verifyWaypointTestClassifications(root);
	}, /must not claim React parity/);
});

test('rejects a stale divergence classification', async function rejectsStaleDivergence(t) {
	const root = await fixture();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	const path = join(root, 'packages/waypoint/audit/test-classifications.json');
	const config = JSON.parse(await readFile(path, 'utf8'));
	const entry = config.tests.find(function findOctaneOnly(item) {
		return item.disposition === 'octane-only-framework-contract';
	});
	delete entry.oracle;
	entry.disposition = 'octane-only-divergence';
	entry.reason = 'injected divergence classification for negative control';
	entry.divergenceId = 'missing-divergence';
	await writeFile(path, `${JSON.stringify(config)}\n`);
	assert.throws(function run() {
		verifyWaypointTestClassifications(root);
	}, /not present in the parity manifest/);
});
