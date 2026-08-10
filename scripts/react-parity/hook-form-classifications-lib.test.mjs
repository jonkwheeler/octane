import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { verifyPortTestClassifications } from './hook-form-classifications-lib.mjs';

async function fixture() {
	const root = await mkdtemp(join(tmpdir(), 'hook-form-classifications-'));
	await cp(
		new URL('../../packages/hook-form/tests', import.meta.url),
		join(root, 'packages/hook-form/tests'),
		{ recursive: true },
	);
	for (const file of [
		'test-classifications.json',
		'react-parity.json',
		'adapted-runtime.json',
		'adapted-runtime-server.json',
	]) {
		await cp(
			new URL(`../../packages/hook-form/audit/${file}`, import.meta.url),
			join(root, `packages/hook-form/audit/${file}`),
			{ recursive: true },
		);
	}
	return root;
}

async function valtioFixture() {
	const root = await mkdtemp(join(tmpdir(), 'valtio-classifications-'));
	await cp(
		new URL('../../packages/valtio/tests', import.meta.url),
		join(root, 'packages/valtio/tests'),
		{ recursive: true },
	);
	await cp(
		new URL('../../packages/valtio/typetests', import.meta.url),
		join(root, 'packages/valtio/typetests'),
		{ recursive: true },
	);
	for (const file of ['test-classifications.json', 'react-parity.json', 'adapted-runtime.json']) {
		await cp(
			new URL(`../../packages/valtio/audit/${file}`, import.meta.url),
			join(root, `packages/valtio/audit/${file}`),
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
	await writeFile(join(root, 'packages/hook-form/tests/new.test.ts'), 'export {};\n');
	assert.throws(function run() {
		verifyPortTestClassifications(root);
	}, /exactly one classification/);
});

test('rejects a parity classification without an oracle', async function rejectsMissingOracle(t) {
	const root = await fixture();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	const sourceUrl = new URL(
		'../../packages/hook-form/audit/test-classifications.json',
		import.meta.url,
	);
	const config = JSON.parse(await readFile(sourceUrl, 'utf8'));
	delete config.tests.find(function findDifferential(entry) {
		return entry.disposition === 'react-octane-differential';
	}).oracle;
	await writeFile(
		join(root, 'packages/hook-form/audit/test-classifications.json'),
		`${JSON.stringify(config)}\n`,
	);
	assert.throws(function run() {
		verifyPortTestClassifications(root);
	}, /requires a React oracle/);
});

test('rejects a stale divergence classification', async function rejectsStaleDivergence(t) {
	const root = await fixture();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	const path = join(root, 'packages/hook-form/audit/test-classifications.json');
	const config = JSON.parse(await readFile(path, 'utf8'));
	config.tests.find(function findDivergence(entry) {
		return entry.disposition === 'octane-only-divergence';
	}).divergenceId = 'missing-divergence';
	await writeFile(path, `${JSON.stringify(config)}\n`);
	assert.throws(function run() {
		verifyPortTestClassifications(root);
	}, /not present in the parity manifest/);
});

test('verifies an arbitrary binding classification ledger', function verifiesValtioLedger() {
	const root = fileURLToPath(new URL('../..', import.meta.url));
	assert.deepEqual(verifyPortTestClassifications(root, 'valtio'), { tests: 8 });
});

test('rejects an unclassified repo-authored upstream test', async function rejectsUpstream(t) {
	const root = await valtioFixture();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	await writeFile(
		join(root, 'packages/valtio/tests/upstream/unclassified.test.ts'),
		'export {};\n',
	);
	assert.throws(function run() {
		verifyPortTestClassifications(root, 'valtio');
	}, /exactly one classification/);
});

test('rejects an unclassified repo-authored typetest', async function rejectsTypetest(t) {
	const root = await valtioFixture();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	await mkdir(join(root, 'packages/valtio/typetests'), { recursive: true });
	await writeFile(join(root, 'packages/valtio/typetests/extra.test-d.ts'), 'export {};\n');
	assert.throws(function run() {
		verifyPortTestClassifications(root, 'valtio');
	}, /exactly one classification/);
});

test('rejects an unclassified ordinary tests-root file', async function rejectsOrdinary(t) {
	const root = await valtioFixture();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	await writeFile(join(root, 'packages/valtio/tests/conformance/extra.test.ts'), 'export {};\n');
	assert.throws(function run() {
		verifyPortTestClassifications(root, 'valtio');
	}, /exactly one classification/);
});
