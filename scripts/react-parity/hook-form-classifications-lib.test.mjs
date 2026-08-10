import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
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

test('verifies an arbitrary binding classification ledger', () => {
	const root = fileURLToPath(new URL('../..', import.meta.url));
	assert.deepEqual(verifyPortTestClassifications(root, 'apollo-client'), { tests: 8 });
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

for (const [binding, testCount] of [
	['lexical', 16],
	['lucide', 6],
	['redux', 3],
	['redux-toolkit', 6],
	['shadcn', 23],
	['sonner', 7],
]) {
	test(`verifies the ${binding} classification ledger`, async (t) => {
		const root = await mkdtemp(join(tmpdir(), 'binding-classifications-'));
		t.after(() => rm(root, { recursive: true, force: true }));
		await cp(
			new URL(`../../packages/${binding}/tests`, import.meta.url),
			join(root, `packages/${binding}/tests`),
			{ recursive: true },
		);
		for (const file of ['test-classifications.json', 'react-parity.json']) {
			await cp(
				new URL(`../../packages/${binding}/audit/${file}`, import.meta.url),
				join(root, `packages/${binding}/audit/${file}`),
				{ recursive: true },
			);
		}
		assert.deepEqual(verifyPortTestClassifications(root, binding), { tests: testCount });
		await writeFile(join(root, `packages/${binding}/tests/unclassified.test.ts`), 'export {};\n');
		assert.throws(
			() => verifyPortTestClassifications(root, binding),
			new RegExp(`every port-authored ${binding} test must have exactly one classification`),
		);
	});
}

test('verifies the swr classification ledger including upstream and typetests', async (t) => {
	const root = await mkdtemp(join(tmpdir(), 'swr-classifications-'));
	t.after(() => rm(root, { recursive: true, force: true }));
	const options = { includeUpstream: true, includeTypetests: true };
	await cp(new URL('../../packages/swr/tests', import.meta.url), join(root, 'packages/swr/tests'), {
		recursive: true,
	});
	await cp(
		new URL('../../packages/swr/typetests', import.meta.url),
		join(root, 'packages/swr/typetests'),
		{ recursive: true },
	);
	for (const file of ['test-classifications.json', 'react-parity.json']) {
		await cp(
			new URL(`../../packages/swr/audit/${file}`, import.meta.url),
			join(root, `packages/swr/audit/${file}`),
			{ recursive: true },
		);
	}
	assert.deepEqual(verifyPortTestClassifications(root, 'swr', options), { tests: 14 });
	await writeFile(join(root, 'packages/swr/tests/unclassified.test.ts'), 'export {};\n');
	assert.throws(
		() => verifyPortTestClassifications(root, 'swr', options),
		/every port-authored swr test must have exactly one classification/,
	);
	await rm(join(root, 'packages/swr/tests/unclassified.test.ts'), { force: true });
	await writeFile(join(root, 'packages/swr/typetests/unclassified.ts'), 'export {};\n');
	assert.throws(
		() => verifyPortTestClassifications(root, 'swr', options),
		/every port-authored swr test must have exactly one classification/,
	);
});
