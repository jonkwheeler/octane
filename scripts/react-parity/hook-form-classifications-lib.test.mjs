import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { verifyPortTestClassifications } from './hook-form-classifications-lib.mjs';

test('rejects an unclassified port-authored test', async (t) => {
	const root = await mkdtemp(join(tmpdir(), 'hook-form-classifications-'));
	t.after(() => rm(root, { recursive: true, force: true }));
	await cp(
		new URL('../../packages/hook-form/tests', import.meta.url),
		join(root, 'packages/hook-form/tests'),
		{ recursive: true },
	);
	await cp(
		new URL('../../packages/hook-form/audit/test-classifications.json', import.meta.url),
		join(root, 'packages/hook-form/audit/test-classifications.json'),
		{ recursive: true },
	);
	await writeFile(join(root, 'packages/hook-form/tests/new.test.ts'), 'export {};\n');
	assert.throws(() => verifyPortTestClassifications(root), /exactly one classification/);
});

test('rejects a parity classification without an oracle', async (t) => {
	const root = await mkdtemp(join(tmpdir(), 'hook-form-classifications-'));
	t.after(() => rm(root, { recursive: true, force: true }));
	await cp(
		new URL('../../packages/hook-form/tests', import.meta.url),
		join(root, 'packages/hook-form/tests'),
		{ recursive: true },
	);
	const sourceUrl = new URL(
		'../../packages/hook-form/audit/test-classifications.json',
		import.meta.url,
	);
	const config = JSON.parse(await readFile(sourceUrl, 'utf8'));
	delete config.tests.find((entry) => entry.disposition === 'react-octane-differential').oracle;
	await cp(sourceUrl, join(root, 'packages/hook-form/audit/test-classifications.json'), {
		recursive: true,
	});
	await writeFile(
		join(root, 'packages/hook-form/audit/test-classifications.json'),
		`${JSON.stringify(config)}\n`,
	);
	assert.throws(() => verifyPortTestClassifications(root), /requires a React oracle/);
});
