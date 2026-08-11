import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { recordEvidence } from './evidence-lib.mjs';
import { createBatchManifest } from './state-lib.mjs';

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));

function createReadyBatch() {
	const workRoot = mkdtempSync(path.join(tmpdir(), 'react-port-evidence-cli-'));
	const batchDirectory = path.join(workRoot, 'fixture-batch');
	mkdirSync(batchDirectory);
	const manifest = createBatchManifest({
		batchId: 'fixture-batch',
		inventoryFingerprint: 'inventory',
		nodes: {
			'pkg:widget': {
				packageName: 'widget',
				state: 'ready',
				dependsOn: [],
				evidenceFingerprint: 'evidence',
				nodeFingerprint: 'plan',
				identity: { packageName: 'widget', version: '1.0.0', commit: 'a'.repeat(40) },
				license: {
					policy: 'exact-mit-v1',
					published: { status: 'passed' },
					source: { status: 'passed' },
				},
			},
		},
	});
	writeFileSync(
		path.join(batchDirectory, 'manifest.json'),
		`${JSON.stringify(manifest, null, 2)}\n`,
	);
	return { workRoot, batchDirectory };
}

function runEvidence(arguments_) {
	return spawnSync(process.execPath, [path.join(SCRIPT_DIRECTORY, 'evidence.mjs'), ...arguments_], {
		encoding: 'utf8',
	});
}

function createCompletePackage(root) {
	const packageDirectory = path.join(root, 'packages/widget');
	mkdirSync(path.join(packageDirectory, 'src'), { recursive: true });
	mkdirSync(path.join(packageDirectory, 'tests'));
	writeFileSync(
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
			peerDependencies: { octane: 'workspace:*' },
			devDependencies: { octane: 'workspace:*' },
		}),
	);
	writeFileSync(path.join(packageDirectory, 'src/index.ts'), 'export const widget = true;\n');
	writeFileSync(path.join(packageDirectory, 'tests/widget.test.ts'), 'export {};\n');
	writeFileSync(path.join(packageDirectory, 'README.md'), '# Widget\n');
	writeFileSync(
		path.join(packageDirectory, 'LICENSE'),
		'MIT License Copyright Fixture. Permission is hereby granted, free of charge, to any person obtaining a copy. The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY.',
	);
	writeFileSync(
		path.join(packageDirectory, 'UPSTREAM.md'),
		`# Upstream\n\nwidget@1.0.0\n\ncommit ${'a'.repeat(40)}\n\n## Source boundary\n\nAdapted public behavior.\n`,
	);
	writeFileSync(
		path.join(packageDirectory, 'status.json'),
		JSON.stringify({
			upstream: { package: 'widget', version: '1.0.0' },
			surface: 'Complete.',
			verified: '2026-08-11',
		}),
	);
	return packageDirectory;
}

describe('evidence CLI', () => {
	test('moves a ready node to implementing and records observed gate evidence', () => {
		const { workRoot, batchDirectory } = createReadyBatch();
		const common = ['--work-root', workRoot, '--batch', 'fixture-batch', '--node', 'pkg:widget'];
		const initialized = runEvidence(['init', ...common, '--category', 'thin-core']);
		assert.equal(initialized.status, 0, initialized.stderr);

		const recorded = runEvidence([
			'record',
			...common,
			'--gate',
			'package-tests',
			'--status',
			'passed',
			'--command',
			'pnpm --dir packages/widget test',
			'--observed',
			'12 tests passed',
		]);
		assert.equal(recorded.status, 0, recorded.stderr);
		const manifest = JSON.parse(readFileSync(path.join(batchDirectory, 'manifest.json'), 'utf8'));
		assert.equal(manifest.nodes['pkg:widget'].state, 'implementing');
		assert.equal(
			manifest.nodes['pkg:widget'].evidenceMatrix.gates['package-tests'].status,
			'passed',
		);
	});

	test('refuses verification while required evidence is missing', () => {
		const { workRoot } = createReadyBatch();
		const common = ['--work-root', workRoot, '--batch', 'fixture-batch', '--node', 'pkg:widget'];
		assert.equal(runEvidence(['init', ...common, '--category', 'thin-core']).status, 0);

		const inputRoot = mkdtempSync(path.join(tmpdir(), 'react-port-evidence-input-'));
		for (const [name, value] of Object.entries({
			'registrations.json': [],
			'crosswalk.json': [],
			'closure.json': { runtimeDependencies: [], adaptedSources: [] },
		})) {
			writeFileSync(path.join(inputRoot, name), JSON.stringify(value));
		}
		const verified = runEvidence([
			'verify',
			...common,
			'--package-dir',
			path.join(inputRoot, 'missing-package'),
			'--expected-directory',
			'packages/widget',
			'--registrations',
			path.join(inputRoot, 'registrations.json'),
			'--crosswalk',
			path.join(inputRoot, 'crosswalk.json'),
			'--closure',
			path.join(inputRoot, 'closure.json'),
		]);

		assert.equal(verified.status, 2);
		const report = JSON.parse(verified.stdout);
		assert.equal(report.status, 'blocked');
		assert.ok(report.issues.some((issue) => issue.includes('package-tests')));
	});

	test('advances implementing to verified only after every machine and recorded gate passes', () => {
		const { workRoot, batchDirectory } = createReadyBatch();
		const common = ['--work-root', workRoot, '--batch', 'fixture-batch', '--node', 'pkg:widget'];
		assert.equal(runEvidence(['init', ...common, '--category', 'thin-core']).status, 0);
		const manifestPath = path.join(batchDirectory, 'manifest.json');
		const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
		const automated = new Set([
			'upstream-crosswalk',
			'package-contract',
			'provenance',
			'closure-audit',
		]);
		for (const gate of Object.values(manifest.nodes['pkg:widget'].evidenceMatrix.gates)) {
			if (gate.status !== 'required' || automated.has(gate.id)) continue;
			recordEvidence(manifest.nodes['pkg:widget'].evidenceMatrix, gate.id, {
				status: 'passed',
				artifact: 'fixture-evidence',
				observed: 'fixture gate passed',
			});
		}
		writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

		const inputRoot = mkdtempSync(path.join(tmpdir(), 'react-port-evidence-success-'));
		const packageDirectory = createCompletePackage(inputRoot);
		for (const [name, value] of Object.entries({
			'registrations.json': [],
			'crosswalk.json': [],
			'closure.json': { runtimeDependencies: ['octane'], adaptedSources: [] },
		})) {
			writeFileSync(path.join(inputRoot, name), JSON.stringify(value));
		}
		const verified = runEvidence([
			'verify',
			...common,
			'--package-dir',
			packageDirectory,
			'--expected-directory',
			'packages/widget',
			'--registrations',
			path.join(inputRoot, 'registrations.json'),
			'--crosswalk',
			path.join(inputRoot, 'crosswalk.json'),
			'--closure',
			path.join(inputRoot, 'closure.json'),
		]);

		assert.equal(verified.status, 0, verified.stderr);
		const report = JSON.parse(verified.stdout);
		assert.equal(report.status, 'passed');
		assert.equal(report.state, 'verified');
	});
});
