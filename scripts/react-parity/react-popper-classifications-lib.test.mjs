import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { verifyReactPopperTestClassifications } from './react-popper-classifications-lib.mjs';

async function fixture() {
	const root = await mkdtemp(join(tmpdir(), 'react-popper-classifications-'));
	await cp(
		new URL('../../packages/react-popper/tests', import.meta.url),
		join(root, 'packages/react-popper/tests'),
		{ recursive: true },
	);
	await cp(
		new URL('../../packages/react-popper/typetests', import.meta.url),
		join(root, 'packages/react-popper/typetests'),
		{ recursive: true },
	);
	for (const file of ['test-classifications.json', 'react-parity.json']) {
		await cp(
			new URL(`../../packages/react-popper/audit/${file}`, import.meta.url),
			join(root, `packages/react-popper/audit/${file}`),
			{ recursive: true },
		);
	}
	return root;
}

test('verifies the react-popper classification ledger', function verifiesLedger() {
	const root = fileURLToPath(new URL('../..', import.meta.url));
	assert.deepEqual(verifyReactPopperTestClassifications(root), { tests: 11 });
});

test('rejects an unclassified port-authored test', async function rejectsUnclassified(t) {
	const root = await fixture();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	await writeFile(join(root, 'packages/react-popper/tests/new.test.ts'), 'export {};\n');
	assert.throws(function run() {
		verifyReactPopperTestClassifications(root);
	}, /exactly one classification/);
});

test('rejects a parity classification without an oracle', async function rejectsMissingOracle(t) {
	const root = await fixture();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	const path = join(root, 'packages/react-popper/audit/test-classifications.json');
	const config = JSON.parse(await readFile(path, 'utf8'));
	delete config.tests.find(function find(entry) {
		return entry.disposition === 'react-octane-differential';
	}).oracle;
	await writeFile(path, `${JSON.stringify(config)}\n`);
	assert.throws(function run() {
		verifyReactPopperTestClassifications(root);
	}, /requires a React oracle/);
});
