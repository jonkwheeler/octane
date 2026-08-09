import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
	ADAPTED_BROWSER_SUITE,
	ADAPTED_BROWSER_SUITE_LOCK,
	ALLOWED_TRANSFORMS_DOC,
	UPSTREAM_BROWSER_SUITE,
	extractBrowserCases,
	renderAdaptedBrowserSuiteLock,
	verifyWaypointBrowserSuite,
} from './waypoint-browser-suite-lib.mjs';

const REPO_UPSTREAM = new URL(`../../${UPSTREAM_BROWSER_SUITE}`, import.meta.url);
const REPO_ADAPTED = new URL(`../../${ADAPTED_BROWSER_SUITE}`, import.meta.url);
const REPO_TRANSFORMS = new URL(`../../${ALLOWED_TRANSFORMS_DOC}`, import.meta.url);

async function fixtureFromRepo() {
	const root = await mkdtemp(join(tmpdir(), 'waypoint-browser-suite-'));
	const upstreamPath = join(root, UPSTREAM_BROWSER_SUITE);
	const adaptedPath = join(root, ADAPTED_BROWSER_SUITE);
	const transformsPath = join(root, ALLOWED_TRANSFORMS_DOC);
	const lockPath = join(root, ADAPTED_BROWSER_SUITE_LOCK);
	await mkdir(join(upstreamPath, '..'), { recursive: true });
	await mkdir(join(adaptedPath, '..'), { recursive: true });
	await mkdir(join(transformsPath, '..'), { recursive: true });
	await mkdir(join(lockPath, '..'), { recursive: true });
	await writeFile(upstreamPath, await readFile(REPO_UPSTREAM));
	await writeFile(adaptedPath, await readFile(REPO_ADAPTED));
	await writeFile(transformsPath, await readFile(REPO_TRANSFORMS));
	const lock = renderAdaptedBrowserSuiteLock(root);
	await writeFile(lockPath, `${JSON.stringify(lock, null, '\t')}\n`);
	return { root, adaptedPath, upstreamPath, lockPath, transformsPath };
}

test('accepts the locked adapted browser suite', async function acceptsLockedSuite(t) {
	const value = await fixtureFromRepo();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	const result = verifyWaypointBrowserSuite(value.root);
	assert.equal(result.cases, 112);
	assert.equal(typeof result.sha256, 'string');
	assert.equal(result.sha256.length, 64);
});

test('rejects deleting an expect assertion', async function rejectsDeletedExpect(t) {
	const value = await fixtureFromRepo();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	const source = await readFile(value.adaptedPath, 'utf8');
	const next = source.replace(/\n\s*expect\(console\.log\)\.toHaveBeenCalled\(\);[^\n]*/, '');
	assert.notEqual(next, source);
	await writeFile(value.adaptedPath, next);
	assert.throws(function run() {
		verifyWaypointBrowserSuite(value.root);
	}, /expect fingerprints diverged|SHA256 drifted/);
});

test('rejects changing an expect matcher', async function rejectsChangedMatcher(t) {
	const value = await fixtureFromRepo();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	const source = await readFile(value.adaptedPath, 'utf8');
	const next = source.replace(
		'expect(console.log).toHaveBeenCalled()',
		'expect(console.log).not.toHaveBeenCalled()',
	);
	assert.notEqual(next, source);
	await writeFile(value.adaptedPath, next);
	assert.throws(function run() {
		verifyWaypointBrowserSuite(value.root);
	}, /expect fingerprints diverged|SHA256 drifted/);
});

test('rejects removing a case-level Per citation', async function rejectsRemovedCitation(t) {
	const value = await fixtureFromRepo();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	const source = await readFile(value.adaptedPath, 'utf8');
	const next = source.replace(
		/\n\t\/\/ Per packages\/waypoint\/upstream\/test\/browser\/waypoint_test\.jsx:\d+\n\tit\('logs to the console/,
		"\n\tit('logs to the console",
	);
	assert.notEqual(next, source);
	await writeFile(value.adaptedPath, next);
	// Refresh lock so the citation check is what fails (not SHA alone).
	const lock = renderAdaptedBrowserSuiteLock(value.root);
	await writeFile(value.lockPath, `${JSON.stringify(lock, null, '\t')}\n`);
	assert.throws(function run() {
		verifyWaypointBrowserSuite(value.root);
	}, /missing \/\/ Per citations/);
});

test('rejects unlisted fixture marker drift', async function rejectsFixtureDrift(t) {
	const value = await fixtureFromRepo();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	const source = await readFile(value.adaptedPath, 'utf8');
	const needle =
		'function doOnEnter() {\n\t\t\t\t\twrapperProps.onEnter();\n\t\t\t\t\tsetTick(function bump(previous) {\n\t\t\t\t\t\treturn previous + 1;\n\t\t\t\t\t});\n\t\t\t\t}';
	const next = source.replace(
		needle,
		'function doOnEnter() {\n\t\t\t\t\twrapperProps.onEnter();\n\t\t\t\t\tsetTick(function bump(previous) {\n\t\t\t\t\t\treturn previous + 1;\n\t\t\t\t\t});\n\t\t\t\t\twrapperProps.setState({});\n\t\t\t\t}',
	);
	assert.notEqual(next, source);
	await writeFile(value.adaptedPath, next);
	const lock = renderAdaptedBrowserSuiteLock(value.root);
	await writeFile(value.lockPath, `${JSON.stringify(lock, null, '\t')}\n`);
	assert.throws(function run() {
		verifyWaypointBrowserSuite(value.root);
	}, /fixture markers diverged/);
});

test('rejects adapted suite SHA drift without lock refresh', async function rejectsShaDrift(t) {
	const value = await fixtureFromRepo();
	t.after(function cleanup() {
		return rm(value.root, { recursive: true, force: true });
	});
	const source = await readFile(value.adaptedPath, 'utf8');
	await writeFile(value.adaptedPath, `${source}\n// intentional noop drift\n`);
	assert.throws(function run() {
		verifyWaypointBrowserSuite(value.root);
	}, /SHA256 drifted/);
});

test('extractBrowserCases preserves title order across suites', async function titleOrder() {
	const upstream = extractBrowserCases(await readFile(REPO_UPSTREAM, 'utf8'));
	const adapted = extractBrowserCases(await readFile(REPO_ADAPTED, 'utf8'));
	assert.equal(upstream.length, adapted.length);
	for (let index = 0; index < upstream.length; index++) {
		assert.equal(upstream[index].title, adapted[index].title);
	}
});
