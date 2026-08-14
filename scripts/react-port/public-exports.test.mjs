import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { inspectPublicExports } from './public-exports.mjs';

test('validates every target in an export fallback array', () => {
	const packageDirectory = mkdtempSync(path.join(tmpdir(), 'react-port-public-exports-'));
	mkdirSync(path.join(packageDirectory, 'src'));
	writeFileSync(path.join(packageDirectory, 'src/index.js'), 'export const primary = true;\n');
	writeFileSync(path.join(packageDirectory, 'src/fallback.js'), 'export const fallback = true;\n');
	writeFileSync(
		path.join(packageDirectory, 'package.json'),
		JSON.stringify({
			name: '@octanejs/export-array-fixture',
			exports: {
				'.': ['./src/index.js', './src/fallback.js'],
			},
		}),
	);

	const report = inspectPublicExports(packageDirectory);

	assert.deepEqual(
		report.targets.map(({ keyPath, target }) => ({ keyPath, target })),
		[
			{ keyPath: 'exports..[0]', target: './src/index.js' },
			{ keyPath: 'exports..[1]', target: './src/fallback.js' },
		],
	);
});
