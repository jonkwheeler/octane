import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzeMigration } from '../src/migrate/analyze.js';
import { createFixture, installed } from './helpers/fixture.js';

const FIXTURES = new URL('./fixtures/migration/', import.meta.url);
const projects = [];

afterEach(() => {
	while (projects.length > 0) projects.pop()?.cleanup();
});

function source(name) {
	return readFileSync(new URL(`${name}/Leaf.tsx`, FIXTURES), 'utf8');
}

function project(files) {
	const created = createFixture({
		'package.json': { name: 'migration-corpus' },
		...files,
	});
	projects.push(created);
	return created;
}

const MANTINE_PACKAGES = [
	'@mantine/charts',
	'@mantine/notifications',
	'@mantine/spotlight',
	'@mantine/code-highlight',
	'@mantine/tiptap',
	'@mantine/dropzone',
	'@mantine/carousel',
	'@mantine/nprogress',
	'@mantine/modals',
	'@mantine/schedule',
];

describe('migration compatibility corpus', () => {
	it('resolves mobx-react-lite only through generated binding metadata', () => {
		const fixture = project({
			'src/Leaf.tsx': source('mobx-supported'),
			...installed('mobx-react-lite', '4.1.1', {
				peerDependencies: { mobx: '^6.9.0', react: '^19.0.0' },
			}),
		});

		const report = analyzeMigration({ root: fixture.root, entries: ['src/Leaf.tsx'] });

		expect(report.packages).toContainEqual(
			expect.objectContaining({
				specifier: 'mobx-react-lite',
				classification: 'supported',
				replacement: '@octanejs/mobx',
				evidence: 'binding-catalog:react-package',
			}),
		);
		expect(report.blocked).toBe(false);
	});

	it('keeps unported Mantine extensions blocked without hiding supported dependencies', () => {
		let installedPackages = {};
		for (const packageName of MANTINE_PACKAGES) {
			installedPackages = {
				...installedPackages,
				...installed(packageName, '8.3.0', {
					peerDependencies: { react: '^19.0.0', 'react-dom': '^19.0.0' },
				}),
			};
		}
		const fixture = project({
			'src/Leaf.tsx': source('mantine-blocked'),
			...installed('@mantine/hooks', '9.5.0', {
				peerDependencies: { react: '^19.2.0' },
			}),
			...installedPackages,
		});

		const report = analyzeMigration({ root: fixture.root, entries: ['src/Leaf.tsx'] });
		const bySpecifier = new Map(report.packages.map((entry) => [entry.specifier, entry]));

		for (const packageName of MANTINE_PACKAGES) {
			expect(bySpecifier.get(packageName)).toMatchObject({
				classification: 'blocked',
				evidence: 'react-dependency',
			});
		}
		expect(bySpecifier.get('@mantine/hooks')).toMatchObject({
			classification: 'supported',
			replacement: '@octanejs/mantine-hooks',
			evidence: 'binding-catalog:react-package',
		});
		expect(bySpecifier.get('@mantine/core')).toMatchObject({
			classification: 'supported',
			replacement: '@octanejs/mantine-core',
			evidence: 'binding-catalog:react-package',
		});
		expect(bySpecifier.get('@mantine/form')).toMatchObject({
			classification: 'supported',
			replacement: '@octanejs/mantine-form',
			evidence: 'binding-catalog:react-package',
		});
		expect(bySpecifier.get('recharts')).toMatchObject({
			classification: 'supported',
			replacement: '@octanejs/recharts',
		});
		expect(bySpecifier.get('@tiptap/react')).toMatchObject({
			classification: 'supported',
			replacement: '@octanejs/tiptap',
		});
		expect(report.blocked).toBe(true);
	});

	it('returns deterministic corpus reports', () => {
		const fixture = project({
			'src/Leaf.tsx': source('mobx-supported'),
			...installed('mobx-react-lite', '4.1.1', {
				peerDependencies: { react: '^19.0.0' },
			}),
		});
		const input = { root: fixture.root, entries: ['src/Leaf.tsx'] };

		expect(analyzeMigration(input)).toEqual(analyzeMigration(input));
	});
});
