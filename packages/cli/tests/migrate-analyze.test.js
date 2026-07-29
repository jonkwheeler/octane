import { afterEach, describe, expect, it } from 'vitest';
import { analyzeMigration } from '../src/migrate/analyze.js';
import { createFixture, installed } from './helpers/fixture.js';

const fixtures = [];

afterEach(() => {
	while (fixtures.length > 0) fixtures.pop()?.cleanup();
});

function fixture(files) {
	const created = createFixture({ 'package.json': { name: 'migration-fixture' }, ...files });
	fixtures.push(created);
	return created;
}

describe('migration preflight', () => {
	it('walks a cyclic local closure once and resolves catalog-backed bindings', () => {
		const project = fixture({
			'src/Leaf.tsx': `
				import { useSelector } from 'react-redux';
				import { helper } from './helper';
				export function Leaf() { return <span>{helper + useSelector(() => 1)}</span>; }
			`,
			'src/helper.ts': `
				import './Leaf';
				export const helper = 1;
			`,
		});

		const report = analyzeMigration({
			root: project.root,
			entries: ['src/Leaf.tsx'],
		});

		expect(report.files).toHaveLength(2);
		expect(report.packages).toContainEqual(
			expect.objectContaining({
				specifier: 'react-redux',
				classification: 'supported',
				replacement: '@octanejs/redux',
			}),
		);
		expect(report.blocked).toBe(false);
	});

	it('resolves directory index imports as files', () => {
		const project = fixture({
			'src/Leaf.tsx': `import { helper } from './helper'; export const Leaf = () => <p>{helper}</p>;`,
			'src/helper/index.ts': `export const helper = 1;`,
		});

		const report = analyzeMigration({ root: project.root, entries: ['src/Leaf.tsx'] });

		expect(report.files.map((file) => file.slice(project.root.length))).toEqual([
			'/src/helper/index.ts',
			'/src/Leaf.tsx',
		]);
		expect(report.blocked).toBe(false);
	});

	it('expands selected directories deterministically', () => {
		const project = fixture({
			'src/B.tsx': `export const B = () => <b />;`,
			'src/A.tsx': `export const A = () => <a />;`,
			'src/readme.md': 'ignored',
		});

		const report = analyzeMigration({ root: project.root, entries: ['src'] });

		expect(report.entries.map((entry) => entry.slice(project.root.length))).toEqual([
			'/src/A.tsx',
			'/src/B.tsx',
		]);
	});

	it('blocks a React-bound Mantine package but labels vanilla packages only as candidates', () => {
		const project = fixture({
			'src/Leaf.tsx': `
				import { Button } from '@mantine/core';
				import { clamp } from 'vanilla-math';
				export function Leaf() { return <Button>{clamp(1)}</Button>; }
			`,
			...installed('@mantine/core', '8.0.0', { peerDependencies: { react: '^19.0.0' } }),
			...installed('vanilla-math', '1.0.0'),
		});

		const report = analyzeMigration({ root: project.root, entries: ['src/Leaf.tsx'] });

		expect(report.packages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					specifier: '@mantine/core',
					classification: 'blocked',
					evidence: 'react-dependency',
				}),
				expect.objectContaining({
					specifier: 'vanilla-math',
					classification: 'candidate',
					evidence: 'no-react-evidence',
				}),
			]),
		);
		expect(report.blocked).toBe(true);
	});

	it('reports source blockers and unresolved computed imports without aborting the report', () => {
		const project = fixture({
			'src/Legacy.tsx': `
				import React from 'react';
				export class Legacy extends React.Component {
					render() { return <div />; }
				}
				export const load = (name: string) => import('./widgets/' + name);
			`,
		});

		const report = analyzeMigration({ root: project.root, entries: ['src/Legacy.tsx'] });

		expect(report.findings.map((finding) => finding.code)).toEqual(
			expect.arrayContaining(['class-component', 'computed-import', 'package-supported']),
		);
		expect(report.findings.every((finding) => 'location' in finding)).toBe(true);
		expect(report.blocked).toBe(true);
	});

	it('does not mistake ordinary classes or local names for React APIs', () => {
		const project = fixture({
			'src/Leaf.tsx': `
				class Formatter {
					format(value: string) { return value.toUpperCase(); }
				}
				const forwardRef = (value: string) => value;
				export const Leaf = () => <p>{forwardRef(new Formatter().format('safe'))}</p>;
			`,
		});

		const report = analyzeMigration({ root: project.root, entries: ['src/Leaf.tsx'] });

		expect(report.findings.map((finding) => finding.code)).not.toEqual(
			expect.arrayContaining(['class-component', 'unsupported-react-api']),
		);
		expect(report.blocked).toBe(false);
	});

	it('preserves pure type-only React imports without blocking migration', () => {
		const project = fixture({
			'src/Leaf.tsx': `
				import type { ReactNode } from 'react';
				export const Leaf = ({ children }: { children: ReactNode }) => <p>{children}</p>;
			`,
		});

		const report = analyzeMigration({ root: project.root, entries: ['src/Leaf.tsx'] });

		expect(report.findings.map((finding) => finding.code)).not.toContain('react-import-shape');
		expect(report.packages.some((entry) => entry.specifier === 'react')).toBe(false);
		expect(report.blocked).toBe(false);
	});

	it('classifies conditional package subpaths from the imported entrypoint', () => {
		const project = fixture({
			'src/Leaf.tsx': `
				import { signal } from 'dual-package/vanilla';
				import { Widget } from 'dual-package/react';
				export const Leaf = () => <Widget value={signal()} />;
			`,
			'node_modules/dual-package/package.json': {
				name: 'dual-package',
				version: '1.0.0',
				peerDependencies: { react: '^19' },
				exports: {
					'./vanilla': './vanilla.js',
					'./react': './react.js',
				},
			},
			'node_modules/dual-package/vanilla.js': `export const signal = () => 1;`,
			'node_modules/dual-package/react.js': `import React from 'react'; export const Widget = () => null;`,
		});

		const report = analyzeMigration({ root: project.root, entries: ['src/Leaf.tsx'] });

		expect(report.packages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					specifier: 'dual-package/vanilla',
					classification: 'candidate',
					evidence: 'framework-independent-entrypoint',
				}),
				expect.objectContaining({
					specifier: 'dual-package/react',
					classification: 'blocked',
					evidence: 'react-entrypoint',
				}),
			]),
		);
	});

	it('follows local entrypoint re-exports when checking for React evidence', () => {
		const project = fixture({
			'src/Leaf.tsx': `
				import { Widget } from 'reexported-react';
				export const Leaf = () => <Widget />;
			`,
			'node_modules/reexported-react/package.json': {
				name: 'reexported-react',
				version: '1.0.0',
				peerDependencies: { react: '^19' },
				exports: './index.js',
			},
			'node_modules/reexported-react/index.js': `export { Widget } from './widget.js';`,
			'node_modules/reexported-react/widget.js': `import React from 'react'; export const Widget = () => null;`,
		});

		const report = analyzeMigration({ root: project.root, entries: ['src/Leaf.tsx'] });

		expect(report.packages).toContainEqual(
			expect.objectContaining({
				specifier: 'reexported-react',
				classification: 'blocked',
				evidence: 'react-entrypoint',
			}),
		);
		expect(report.blocked).toBe(true);
	});

	it('follows CommonJS package entrypoints when checking for React evidence', () => {
		const project = fixture({
			'src/Leaf.tsx': `
				import { Widget } from 'commonjs-react';
				export const Leaf = () => <Widget />;
			`,
			'node_modules/commonjs-react/package.json': {
				name: 'commonjs-react',
				version: '1.0.0',
				peerDependencies: { react: '^19' },
				main: './index.cjs',
			},
			'node_modules/commonjs-react/index.cjs': `module.exports = require('./widget.cjs');`,
			'node_modules/commonjs-react/widget.cjs': `
				const React = require('react');
				exports.Widget = () => React.createElement('div');
			`,
		});

		const report = analyzeMigration({ root: project.root, entries: ['src/Leaf.tsx'] });

		expect(report.packages).toContainEqual(
			expect.objectContaining({
				specifier: 'commonjs-react',
				classification: 'blocked',
				evidence: 'react-entrypoint',
			}),
		);
		expect(report.blocked).toBe(true);
	});

	it('resolves package manifests from a nested workspace leaf', () => {
		const project = fixture({
			'app/package.json': { name: 'nested-app' },
			'app/src/Leaf.tsx': `
				import value from 'nested-vanilla';
				export const Leaf = () => <span>{value}</span>;
			`,
			'app/node_modules/nested-vanilla/package.json': {
				name: 'nested-vanilla',
				version: '1.2.3',
				exports: './index.js',
			},
			'app/node_modules/nested-vanilla/index.js': `export default 1;`,
		});

		const report = analyzeMigration({
			root: project.root,
			entries: ['app/src/Leaf.tsx'],
		});

		expect(report.packages).toContainEqual(
			expect.objectContaining({
				specifier: 'nested-vanilla',
				classification: 'candidate',
				version: '1.2.3',
			}),
		);
		expect(report.blocked).toBe(false);
	});

	it('uses the most restrictive classification across nested workspaces', () => {
		const project = fixture({
			'app-a/src/Leaf.tsx': `
				import value from 'shared-package';
				export const LeafA = () => <span>{value}</span>;
			`,
			'app-a/node_modules/shared-package/package.json': {
				name: 'shared-package',
				version: '1.0.0',
				exports: './index.js',
			},
			'app-a/node_modules/shared-package/index.js': `export default 1;`,
			'app-b/src/Leaf.tsx': `
				import Widget from 'shared-package';
				export const LeafB = () => <Widget />;
			`,
			'app-b/node_modules/shared-package/package.json': {
				name: 'shared-package',
				version: '2.0.0',
				peerDependencies: { react: '^19' },
				exports: './index.js',
			},
			'app-b/node_modules/shared-package/index.js': `
				import React from 'react';
				export default () => React.createElement('div');
			`,
		});

		const report = analyzeMigration({
			root: project.root,
			entries: ['app-a/src/Leaf.tsx', 'app-b/src/Leaf.tsx'],
		});

		expect(report.packages).toContainEqual(
			expect.objectContaining({
				specifier: 'shared-package',
				classification: 'blocked',
				evidence: 'react-entrypoint',
				version: '2.0.0',
				locations: expect.arrayContaining([
					expect.objectContaining({ file: expect.stringContaining('/app-a/') }),
					expect.objectContaining({ file: expect.stringContaining('/app-b/') }),
				]),
			}),
		);
		expect(report.blocked).toBe(true);
	});

	it('blocks provider and server ownership while ignoring type-only packages', () => {
		const project = fixture({
			'src/Leaf.tsx': `
				import type { Model } from 'types-only';
				import 'server-only';
				export function Leaf(props: { value: Model }) {
					return <Theme.Provider value={props.value}><p /></Theme.Provider>;
				}
			`,
		});

		const report = analyzeMigration({ root: project.root, entries: ['src/Leaf.tsx'] });

		expect(report.packages.some((entry) => entry.specifier === 'types-only')).toBe(false);
		expect(report.findings.map((finding) => finding.code)).toEqual(
			expect.arrayContaining(['provider-boundary', 'server-only-import']),
		);
	});

	it('returns the same normalized model on repeated analysis', () => {
		const project = fixture({
			'src/Leaf.tsx': `import value from 'vanilla'; export const Leaf = () => <p>{value}</p>;`,
			...installed('vanilla', '1.0.0'),
		});
		const input = { root: project.root, entries: ['src/Leaf.tsx'] };

		expect(analyzeMigration(input)).toEqual(analyzeMigration(input));
	});
});
