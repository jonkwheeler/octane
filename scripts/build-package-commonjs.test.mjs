import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { afterEach, describe, test } from 'node:test';
import { tmpdir } from 'node:os';
import { mkdtemp, rm } from 'node:fs/promises';
import { buildPackageCommonjs } from './build-package-commonjs.mjs';

const fixtures = [];

afterEach(async () => {
	await Promise.all(
		fixtures.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
	);
});

async function fixture(files) {
	const directory = await mkdtemp(join(tmpdir(), 'octane-cjs-builder-'));
	fixtures.push(directory);
	await Promise.all(
		Object.entries(files).map(async ([relativePath, contents]) => {
			const path = join(directory, relativePath);
			await mkdir(join(path, '..'), { recursive: true });
			await writeFile(path, contents);
		}),
	);
	return directory;
}

describe('buildPackageCommonjs', () => {
	test('emits an executable per-module CommonJS graph and removes stale output', async () => {
		const packageDir = await fixture({
			'package.json': JSON.stringify({ name: 'fixture', type: 'module' }),
			'src/index.ts':
				"import config from './data.json' with { type: 'json' }; import { basename } from 'node:path'; import { answer } from './nested/value.js'; export { answer }; export const label = basename(config.path);",
			'src/data.json': JSON.stringify({ path: '/tmp/octane' }),
			'src/nested/value.ts': 'export const answer: number = 42;',
			'dist/cjs/stale.cjs': 'throw new Error("stale");',
		});

		const result = await buildPackageCommonjs({
			packageDir,
			entries: ['src/index.ts'],
			outdir: 'dist/cjs',
		});

		assert.deepEqual(result.entries, { 'src/index.ts': 'dist/cjs/index.cjs' });
		assert.deepEqual(createRequire(import.meta.url)(join(packageDir, 'dist/cjs/index.cjs')), {
			answer: 42,
			label: 'octane',
		});
		await assert.rejects(readFile(join(packageDir, 'dist/cjs/stale.cjs')), /ENOENT/);
		assert.match(
			await readFile(join(packageDir, 'dist/cjs/index.cjs'), 'utf8'),
			/\.\/nested\/value\.cjs/,
		);
	});

	test('supports multiple entries and emits a shared module once', async () => {
		const packageDir = await fixture({
			'package.json': JSON.stringify({ name: 'fixture', type: 'module' }),
			'src/first.ts': "export { value as first } from './shared'; import './cycle-a';",
			'src/second.js': "export { value as second } from './shared.ts';",
			'src/shared.ts': 'export const value = "shared";',
			'src/cycle-a.ts': "import './cycle-b'; export const a = true;",
			'src/cycle-b.ts': "import './cycle-a'; export const b = true;",
		});

		await buildPackageCommonjs({
			packageDir,
			entries: ['src/first.ts', 'src/second.js'],
			outdir: 'dist/cjs',
		});

		const require = createRequire(import.meta.url);
		assert.equal(require(join(packageDir, 'dist/cjs/first.cjs')).first, 'shared');
		assert.equal(require(join(packageDir, 'dist/cjs/second.cjs')).second, 'shared');
		assert.equal(
			await readFile(join(packageDir, 'dist/cjs/shared.cjs'), 'utf8').then(Boolean),
			true,
		);
	});

	test('fails closed for unsupported and invalid authored graphs', async (t) => {
		const cases = [
			[
				'TSRX source',
				{ 'src/index.ts': "import './view.tsrx';", 'src/view.tsrx': 'export default <div />;' },
				/\.tsrx/,
			],
			[
				'missing relative module',
				{ 'src/index.ts': "import './missing';" },
				/Could not resolve|missing/,
			],
			[
				'path escape',
				{ 'src/index.ts': "import '../../outside.js';" },
				/outside|package directory/,
			],
			[
				'top-level await',
				{ 'src/index.ts': 'export const value = await Promise.resolve(1);' },
				/top-level await|CommonJS/i,
			],
		];

		for (const [name, files, expected] of cases) {
			await t.test(name, async () => {
				const packageDir = await fixture({
					'package.json': JSON.stringify({ name: 'fixture', type: 'module' }),
					...files,
				});
				await assert.rejects(
					buildPackageCommonjs({ packageDir, entries: ['src/index.ts'], outdir: 'dist/cjs' }),
					expected,
				);
			});
		}
	});

	test('rejects entries outside the package and colliding output paths', async () => {
		const packageDir = await fixture({
			'package.json': JSON.stringify({ name: 'fixture', type: 'module' }),
			'src/index.ts': 'export const value = 1;',
			'src/index.js': 'export const value = 2;',
		});

		await assert.rejects(
			buildPackageCommonjs({ packageDir, entries: ['../outside.ts'], outdir: 'dist/cjs' }),
			/package directory/,
		);
		await assert.rejects(
			buildPackageCommonjs({
				packageDir,
				entries: ['src/index.ts', 'src/index.js'],
				outdir: 'dist/cjs',
			}),
			/collide|same path/i,
		);
	});
});
