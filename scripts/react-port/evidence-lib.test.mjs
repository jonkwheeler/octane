import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';
import {
	auditShippedClosure,
	createEvidenceMatrix,
	evaluateVerificationReadiness,
	inspectBindingPackage,
	recordEvidence,
	validateUpstreamCrosswalk,
} from './evidence-lib.mjs';

const MIT_TEXT = `MIT License

Copyright (c) Fixture Authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

describe('evidence matrix', () => {
	test('derives mandatory gates from the binding category', () => {
		const matrix = createEvidenceMatrix({
			categories: ['hooks-store', 'ssr-sensitive'],
			preflightArtifact: '.react-port-work/fixture/manifest.json',
		});

		for (const gate of [
			'identity-license',
			'package-tests',
			'identity-lifecycle',
			'ssr-hydration',
			'upstream-crosswalk',
			'closure-audit',
		]) {
			assert.ok(matrix.gates[gate], gate);
		}
		assert.equal(matrix.gates['identity-license'].status, 'passed');
	});

	test('does not accept evidence-free passes or unexplained inapplicability', () => {
		const matrix = createEvidenceMatrix({
			categories: ['thin-core'],
			preflightArtifact: 'manifest.json',
		});
		assert.throws(
			() => recordEvidence(matrix, 'package-tests', { status: 'passed' }),
			/command|artifact/i,
		);
		assert.throws(
			() => recordEvidence(matrix, 'generated-data', { status: 'inapplicable' }),
			/reason/i,
		);
		recordEvidence(matrix, 'package-tests', {
			status: 'passed',
			command: 'pnpm --dir packages/widget test',
			observed: '12 tests passed',
		});
		assert.equal(matrix.gates['package-tests'].status, 'passed');
	});

	test('keeps every upstream registration visible with local evidence or a rationale', () => {
		const registrations = [
			{ id: 'renders', source: 'upstream/widget.test.ts:10' },
			{ id: 'legacy-mode', source: 'upstream/widget.test.ts:30' },
		];
		assert.throws(
			() =>
				validateUpstreamCrosswalk(registrations, [
					{ id: 'renders', classification: 'implemented', localEvidence: 'tests/widget.test.ts' },
				]),
			/missing.*legacy-mode/i,
		);
		const result = validateUpstreamCrosswalk(registrations, [
			{ id: 'renders', classification: 'implemented', localEvidence: 'tests/widget.test.ts' },
			{ id: 'legacy-mode', classification: 'inapplicable', rationale: 'Legacy React root only.' },
		]);
		assert.equal(result.status, 'passed');
		assert.equal(result.cases.length, 2);
	});
});

describe('package and closure completion', () => {
	test('validates durable package shape, provenance, MIT text, and Octane singleton edges', async () => {
		const root = await mkdtemp(path.join(tmpdir(), 'react-port-package-'));
		const packageDirectory = path.join(root, 'packages/widget');
		await mkdir(path.join(packageDirectory, 'src'), { recursive: true });
		await mkdir(path.join(packageDirectory, 'tests'));
		await writeFile(
			path.join(packageDirectory, 'package.json'),
			JSON.stringify({
				name: '@octanejs/widget',
				version: '0.1.0',
				license: 'MIT',
				engines: { node: '>=22' },
				publishConfig: { access: 'public' },
				repository: { directory: 'packages/widget' },
				files: ['src', 'README.md', 'UPSTREAM.md', 'LICENSE'],
				exports: { '.': './src/index.ts' },
				scripts: { test: 'vitest run' },
				dependencies: { 'widget-core': '^1.0.0' },
				peerDependencies: { octane: 'workspace:*' },
				devDependencies: { octane: 'workspace:*' },
			}),
		);
		await writeFile(path.join(packageDirectory, 'src/index.ts'), 'export const widget = true;\n');
		await writeFile(path.join(packageDirectory, 'tests/widget.test.ts'), 'export {};\n');
		await writeFile(path.join(packageDirectory, 'README.md'), '# Widget\n');
		await writeFile(path.join(packageDirectory, 'LICENSE'), MIT_TEXT);
		await writeFile(
			path.join(packageDirectory, 'UPSTREAM.md'),
			'# Upstream\n\nwidget@1.0.0\n\ncommit aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n\n## Source boundary\n\nAdapted src/index.ts.\n',
		);
		await writeFile(
			path.join(packageDirectory, 'status.json'),
			JSON.stringify({
				upstream: { package: 'widget', version: '1.0.0' },
				surface: 'Complete public surface.',
				verified: '2026-08-11',
			}),
		);

		const result = inspectBindingPackage(packageDirectory, {
			expectedDirectory: 'packages/widget',
			identity: { packageName: 'widget', version: '1.0.0', commit: 'a'.repeat(40) },
		});
		assert.equal(result.status, 'passed', result.issues.join('\n'));
	});

	test('blocks unplanned runtime imports and adapted sources without exact-MIT evidence', () => {
		const graphNodes = {
			'pkg:widget': {
				packageName: 'widget',
				dependsOn: ['pkg:widget-core'],
				license: {
					policy: 'exact-mit-v1',
					published: { status: 'passed' },
					source: { status: 'passed' },
				},
			},
			'pkg:widget-core': { packageName: 'widget-core', dependsOn: [], action: 'reuse-package' },
			'pkg:copied-helper': { packageName: 'copied-helper', dependsOn: [] },
		};
		const result = auditShippedClosure({
			nodeId: 'pkg:widget',
			graphNodes,
			runtimeDependencies: ['widget-core', 'surprise-runtime'],
			adaptedSources: [{ packageName: 'copied-helper', paths: ['src/helper.ts'] }],
		});

		assert.equal(result.status, 'blocked');
		assert.match(result.issues.join('\n'), /surprise-runtime/);
		assert.match(result.issues.join('\n'), /copied-helper.*exact-MIT/i);
	});

	test('cannot report verified while a required gate or completion report is missing', () => {
		const matrix = createEvidenceMatrix({
			categories: ['thin-core'],
			preflightArtifact: 'manifest.json',
		});
		const readiness = evaluateVerificationReadiness({
			matrix,
			crosswalkReport: { status: 'passed', cases: [] },
			packageReport: { status: 'passed', issues: [] },
			closureReport: { status: 'passed', issues: [] },
		});
		assert.equal(readiness.status, 'blocked');
		assert.ok(readiness.issues.some((issue) => issue.includes('package-tests')));
	});
});
