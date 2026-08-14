import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { discoverPackageTests, hasObservablePackageTests } from './package-tests-lib.mjs';

test('uses one observable package-test inventory across supported layouts', async () => {
	const packageDirectory = await mkdtemp(path.join(tmpdir(), 'react-port-package-tests-'));
	for (const directory of [
		'src',
		'__tests__',
		'tests',
		'upstream',
		'dist',
		'node_modules/dependency',
	]) {
		await mkdir(path.join(packageDirectory, directory), { recursive: true });
	}
	for (const relativePath of [
		'src/widget.spec.ts',
		'__tests__/behavior.test.ts',
		'tests/component.test.tsrx',
		'upstream/vendor.test.ts',
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
	assert.equal(hasObservablePackageTests(packageDirectory), true);
});
