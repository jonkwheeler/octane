import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import {
	discoverPackageTests,
	discoverReportEligiblePackageTests,
	hasObservablePackageTests,
} from './package-tests-lib.mjs';

test('uses one observable package-test inventory across supported layouts', async () => {
	const packageDirectory = await mkdtemp(path.join(tmpdir(), 'react-port-package-tests-'));
	for (const directory of [
		'src',
		'__tests__',
		'tests',
		'upstream',
		'upstream/__tests__',
		'upstream/fixtures',
		'dist',
		'node_modules/dependency',
	]) {
		await mkdir(path.join(packageDirectory, directory), { recursive: true });
	}
	for (const relativePath of [
		'src/widget.spec.ts',
		'__tests__/behavior.test.ts',
		'__tests__/render.js',
		'tests/component.test.tsrx',
		'upstream/vendor.test.ts',
		'upstream/__tests__/light-async.js',
		'upstream/fixtures/setup.js',
		'dist/built.test.js',
		'node_modules/dependency/dependency.test.js',
	]) {
		await writeFile(path.join(packageDirectory, relativePath), "test('observable', () => {});\n");
	}

	assert.deepEqual(
		discoverPackageTests(packageDirectory).map((file) =>
			path.relative(packageDirectory, file).replaceAll('\\', '/'),
		),
		['__tests__/behavior.test.ts', 'src/widget.spec.ts', 'tests/component.test.tsrx'],
	);
	assert.deepEqual(
		discoverReportEligiblePackageTests(packageDirectory).map((file) =>
			path.relative(packageDirectory, file).replaceAll('\\', '/'),
		),
		[
			'__tests__/behavior.test.ts',
			'__tests__/render.js',
			'src/widget.spec.ts',
			'tests/component.test.tsrx',
			'upstream/__tests__/light-async.js',
			'upstream/vendor.test.ts',
		],
	);
	assert.equal(hasObservablePackageTests(packageDirectory), true);
});
