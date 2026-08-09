import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { verifyPortTestClassifications } from './binding-classifications-lib.mjs';

async function fixture() {
	const root = await mkdtemp(join(tmpdir(), 'hook-form-classifications-'));
	await cp(
		new URL('../../packages/hook-form/tests', import.meta.url),
		join(root, 'packages/hook-form/tests'),
		{ recursive: true },
	);
	for (const file of ['test-classifications.json', 'react-parity.json']) {
		await cp(
			new URL(`../../packages/hook-form/audit/${file}`, import.meta.url),
			join(root, `packages/hook-form/audit/${file}`),
			{ recursive: true },
		);
	}
	return root;
}

test('rejects an unclassified port-authored test', async (t) => {
	const root = await fixture();
	t.after(() => rm(root, { recursive: true, force: true }));
	await writeFile(join(root, 'packages/hook-form/tests/new.test.ts'), 'export {};\n');
	assert.throws(() => verifyPortTestClassifications(root), /exactly one classification/);
});

test('rejects a parity classification without an oracle', async (t) => {
	const root = await fixture();
	t.after(() => rm(root, { recursive: true, force: true }));
	const sourceUrl = new URL(
		'../../packages/hook-form/audit/test-classifications.json',
		import.meta.url,
	);
	const config = JSON.parse(await readFile(sourceUrl, 'utf8'));
	delete config.tests.find((entry) => entry.disposition === 'react-octane-differential').oracle;
	await writeFile(
		join(root, 'packages/hook-form/audit/test-classifications.json'),
		`${JSON.stringify(config)}\n`,
	);
	assert.throws(() => verifyPortTestClassifications(root), /requires a React oracle/);
});

test('rejects a stale divergence classification', async (t) => {
	const root = await fixture();
	t.after(() => rm(root, { recursive: true, force: true }));
	const path = join(root, 'packages/hook-form/audit/test-classifications.json');
	const config = JSON.parse(await readFile(path, 'utf8'));
	config.tests.find((entry) => entry.disposition === 'octane-only-divergence').divergenceId =
		'missing-divergence';
	await writeFile(path, `${JSON.stringify(config)}\n`);
	assert.throws(() => verifyPortTestClassifications(root), /not present in the parity manifest/);
});

test('verifies an arbitrary binding classification ledger', async (t) => {
	const root = await mkdtemp(join(tmpdir(), 'binding-classifications-'));
	t.after(() => rm(root, { recursive: true, force: true }));
	await cp(
		new URL('../../packages/tanstack-form/tests', import.meta.url),
		join(root, 'packages/tanstack-form/tests'),
		{ recursive: true },
	);
	for (const file of ['test-classifications.json', 'react-parity.json']) {
		await cp(
			new URL(`../../packages/tanstack-form/audit/${file}`, import.meta.url),
			join(root, `packages/tanstack-form/audit/${file}`),
			{ recursive: true },
		);
	}
	assert.deepEqual(verifyPortTestClassifications(root, 'tanstack-form'), { tests: 12 });
	const classificationPath = join(root, 'packages/tanstack-form/audit/test-classifications.json');
	const classifications = JSON.parse(await readFile(classificationPath, 'utf8'));
	const divergenceEntry = classifications.tests.find(
		(entry) => entry.path === 'packages/tanstack-form/tests/conformance/divergences.test.ts',
	);
	divergenceEntry.disposition = 'octane-only-divergence';
	divergenceEntry.divergenceIds = ['missing-divergence'];
	divergenceEntry.reason = 'documents an Octane-only divergence contract';
	await writeFile(classificationPath, `${JSON.stringify(classifications)}\n`);
	assert.throws(
		() => verifyPortTestClassifications(root, 'tanstack-form'),
		/divergence id is not present/,
	);

	await cp(
		new URL('../../packages/tanstack-form/audit/test-classifications.json', import.meta.url),
		classificationPath,
	);
	await writeFile(join(root, 'packages/tanstack-form/tests/unclassified.test.ts'), 'export {};\n');
	assert.throws(
		() => verifyPortTestClassifications(root, 'tanstack-form'),
		/every port-authored tanstack-form test must have exactly one classification/,
	);
});
