import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { verifyAlienSignalsTestClassifications } from './alien-signals-classifications-lib.mjs';

async function fixture() {
	const root = await mkdtemp(join(tmpdir(), 'alien-signals-classifications-'));
	await cp(
		new URL('../../packages/alien-signals/tests', import.meta.url),
		join(root, 'packages/alien-signals/tests'),
		{ recursive: true },
	);
	await mkdir(join(root, 'playground/octane/src/demos'), { recursive: true });
	await cp(
		new URL('../../playground/octane/src/demos/AlienSignals.test.ts', import.meta.url),
		join(root, 'playground/octane/src/demos/AlienSignals.test.ts'),
	);
	for (const file of ['test-classifications.json', 'react-parity.json']) {
		await cp(
			new URL(`../../packages/alien-signals/audit/${file}`, import.meta.url),
			join(root, `packages/alien-signals/audit/${file}`),
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
	await writeFile(join(root, 'packages/alien-signals/tests/new.test.ts'), 'export {};\n');
	assert.throws(function run() {
		verifyAlienSignalsTestClassifications(root);
	}, /exactly one classification/);
});

test('rejects an unclassified playground alien-signals test', async function rejectsUnclassifiedPlayground(t) {
	const root = await fixture();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	await writeFile(
		join(root, 'playground/octane/src/demos/AlienSignals.extra.test.ts'),
		'export {};\n',
	);
	assert.throws(function run() {
		verifyAlienSignalsTestClassifications(root);
	}, /exactly one classification/);
});

test('rejects a parity classification without an oracle', async function rejectsMissingOracle(t) {
	const root = await fixture();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	const path = join(root, 'packages/alien-signals/audit/test-classifications.json');
	const config = JSON.parse(await readFile(path, 'utf8'));
	delete config.tests.find(function findAdapted(entry) {
		return entry.disposition === 'adapted-upstream-suite';
	}).oracle;
	await writeFile(path, `${JSON.stringify(config)}\n`);
	assert.throws(function run() {
		verifyAlienSignalsTestClassifications(root);
	}, /requires a React oracle/);
});

test('rejects an Octane-only classification that claims an oracle', async function rejectsOracle(t) {
	const root = await fixture();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	const path = join(root, 'packages/alien-signals/audit/test-classifications.json');
	const config = JSON.parse(await readFile(path, 'utf8'));
	config.tests.find(function findOctaneOnly(entry) {
		return entry.disposition === 'octane-only-framework-contract';
	}).oracle = 'must not claim parity';
	await writeFile(path, `${JSON.stringify(config)}\n`);
	assert.throws(function run() {
		verifyAlienSignalsTestClassifications(root);
	}, /must not claim React parity/);
});
