import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';

import {
	collectUpstreamCaseInventory,
	verifyReactTransitionGroupUpstream,
} from './react-transition-group-upstream-lib.mjs';

async function fixture() {
	const root = await mkdtemp(join(tmpdir(), 'rtg-upstream-'));
	await cp(
		new URL('../../packages/react-transition-group/upstream', import.meta.url),
		join(root, 'packages/react-transition-group/upstream'),
		{ recursive: true },
	);
	await cp(
		new URL('../../packages/react-transition-group/tests/upstream', import.meta.url),
		join(root, 'packages/react-transition-group/tests/upstream'),
		{ recursive: true },
	);
	await mkdir(join(root, 'packages/react-transition-group/tests/ssr'), { recursive: true });
	await cp(
		new URL(
			'../../packages/react-transition-group/tests/ssr/upstream-import.test.ts',
			import.meta.url,
		),
		join(root, 'packages/react-transition-group/tests/ssr/upstream-import.test.ts'),
	);
	for (const file of [
		'SHA256SUMS',
		'upstream-test-dispositions.json',
		'case-crosswalk.json',
		'adapted-runtime.json',
		'adapted-runtime-server.json',
	]) {
		await cp(
			new URL(`../../packages/react-transition-group/audit/${file}`, import.meta.url),
			join(root, `packages/react-transition-group/audit/${file}`),
		);
	}
	return root;
}

test('accepts the committed upstream dispositions and case inventory', async function acceptsCommitted(t) {
	const root = await fixture();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	const summary = verifyReactTransitionGroupUpstream(root);
	assert.equal(summary.artifacts, 11);
	assert.equal(summary.cases, collectUpstreamCaseInventory(root).length);
	assert.equal(summary.adaptedCases, 55);
	assert.equal(summary.notApplicableCases, 1);
	assert.ok(summary.cases > 0);
});

test('rejects a missing upstream test artifact disposition', async function rejectsMissingDisposition(t) {
	const root = await fixture();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	const path = join(root, 'packages/react-transition-group/audit/upstream-test-dispositions.json');
	const config = JSON.parse(await readFile(path, 'utf8'));
	config.artifacts = config.artifacts.filter(function keep(entry) {
		return entry.path !== 'SSR-test.js';
	});
	await writeFile(path, `${JSON.stringify(config)}\n`);
	assert.throws(function run() {
		verifyReactTransitionGroupUpstream(root);
	}, /must account for every upstream\/test artifact/);
});

test('rejects a stale caseCount for an upstream suite', async function rejectsStaleCaseCount(t) {
	const root = await fixture();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	const path = join(root, 'packages/react-transition-group/audit/upstream-test-dispositions.json');
	const config = JSON.parse(await readFile(path, 'utf8'));
	config.artifacts.find(function findSsr(entry) {
		return entry.path === 'SSR-test.js';
	}).caseCount = 0;
	await writeFile(path, `${JSON.stringify(config)}\n`);
	assert.throws(function run() {
		verifyReactTransitionGroupUpstream(root);
	}, /caseCount|case inventory drifted/);
});

test('rejects removal of an upstream suite case', async function rejectsRemovedCase(t) {
	const root = await fixture();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	const suitePath = join(root, 'packages/react-transition-group/upstream/test/SSR-test.js');
	await writeFile(
		suitePath,
		`/**
 * @jest-environment node
 */

import * as ReactTransitionGroup from '../src'; // eslint-disable-line no-unused-vars

describe('SSR', () => {});
`,
	);
	const { renderReactTransitionGroupUpstreamInventory } =
		await import('./react-transition-group-upstream-lib.mjs');
	await writeFile(
		join(root, 'packages/react-transition-group/audit/SHA256SUMS'),
		renderReactTransitionGroupUpstreamInventory(root),
	);
	assert.throws(function run() {
		verifyReactTransitionGroupUpstream(root);
	}, /caseCount|case inventory drifted/);
});

test('rejects a deleted upstream suite file', async function rejectsDeletedSuite(t) {
	const root = await fixture();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	await rm(join(root, 'packages/react-transition-group/upstream/test/SSR-test.js'));
	const { renderReactTransitionGroupUpstreamInventory } =
		await import('./react-transition-group-upstream-lib.mjs');
	await writeFile(
		join(root, 'packages/react-transition-group/audit/SHA256SUMS'),
		renderReactTransitionGroupUpstreamInventory(root),
	);
	assert.throws(function run() {
		verifyReactTransitionGroupUpstream(root);
	}, /must account for every upstream\/test artifact/);
});

test('rejects adapted case drift against the crosswalk', async function rejectsAdaptedCaseDrift(t) {
	const root = await fixture();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	const adaptedPath = join(
		root,
		'packages/react-transition-group/tests/ssr/upstream-import.test.ts',
	);
	await writeFile(
		adaptedPath,
		`import { describe, expect, it } from 'vitest';
import * as binding from '../../src/index.ts';

describe('react-transition-group v4.4.5 server rendering', () => {
	// Per path: packages/react-transition-group/upstream/test/SSR-test.js:8-10
	it('should import react-transition-group in node env', function importInNode() {
		expect(binding.Transition).toBeTypeOf('function');
	});
	it('drifted adapted case without upstream mapping', function drifted() {
		expect(true).toBe(true);
	});
});
`,
	);
	assert.throws(function run() {
		verifyReactTransitionGroupUpstream(root);
	}, /adapted case\/fixture drift|adapted inventory is missing identity|missing \/\/ Per path/);
});

test('rejects a crosswalk entry with a missing citation', async function rejectsMissingCitation(t) {
	const root = await fixture();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	const adaptedPath = join(
		root,
		'packages/react-transition-group/tests/ssr/upstream-import.test.ts',
	);
	const source = await readFile(adaptedPath, 'utf8');
	await writeFile(adaptedPath, source.replace(/\/\/\s*Per path:[^\n]*\n/, ''));
	assert.throws(function run() {
		verifyReactTransitionGroupUpstream(root);
	}, /missing \/\/ Per path:/);
});

test('rejects omitting the findDOMNode not-applicable crosswalk entry', async function rejectsMissingNotApplicable(t) {
	const root = await fixture();
	t.after(function cleanup() {
		return rm(root, { recursive: true, force: true });
	});
	const path = join(root, 'packages/react-transition-group/audit/case-crosswalk.json');
	const crosswalk = JSON.parse(await readFile(path, 'utf8'));
	crosswalk.cases = crosswalk.cases.filter(function keep(entry) {
		return entry.disposition !== 'not-applicable';
	});
	await writeFile(path, `${JSON.stringify(crosswalk)}\n`);
	assert.throws(function run() {
		verifyReactTransitionGroupUpstream(root);
	}, /cover every upstream case|must match the upstream case inventory/);
});
