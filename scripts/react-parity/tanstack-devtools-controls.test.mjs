import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { verifyLaneCollectedTests } from './harness-lib.mjs';
import { verifyTypeInventories } from './tanstack-devtools-types-lib.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const manifest = JSON.parse(
	readFileSync(
		new URL('../../packages/tanstack-devtools/audit/react-parity.json', import.meta.url),
		'utf8',
	),
);

test('tanstack-devtools classifies every port-authored test exactly once', () => {
	const discovered = readdirSync(resolve(root, 'packages/tanstack-devtools/tests'), {
		recursive: true,
		withFileTypes: true,
	})
		.filter((entry) => entry.isFile() && /\.test\.(?:ts|tsx|tsrx)$/.test(entry.name))
		.map((entry) =>
			relative(root, resolve(entry.parentPath ?? entry.path, entry.name))
				.split(sep)
				.join('/'),
		)
		.sort();
	const declared = JSON.parse(
		readFileSync(
			new URL('../../packages/tanstack-devtools/audit/test-classifications.json', import.meta.url),
			'utf8',
		),
	)
		.tests.map((entry) => entry.path)
		.sort();
	assert.deepEqual(discovered, declared);
});

test('tanstack-devtools differential lane rejects a renamed declared case', () => {
	const lane = manifest.lanes.find((entry) => entry.id === 'tanstack-devtools-differential');
	const collected = lane.files
		.filter((file) => file.role === 'test')
		.flatMap((file) =>
			file.cases.map((entry) => ({
				file: fileURLToPath(new URL(`../../${file.path}`, import.meta.url)),
				name: `${entry.fullName} renamed`,
			})),
		);
	assert.throws(
		() => verifyLaneCollectedTests(lane, collected, root),
		/fullName must match exactly one collected Vitest test/,
	);
});

test('tanstack-devtools records repo-authored type probes with paired lanes', () => {
	assert.equal(manifest.upstreamSuites.types, 'absent');
	assert.equal(manifest.provenance.verification, 'verified');
	for (const id of ['tanstack-devtools-pristine-types', 'tanstack-devtools-adapted-types']) {
		const lane = manifest.lanes.find((entry) => entry.id === id);
		assert.equal(lane?.oracle, 'required');
		assert.equal(lane?.evidenceOrigin, 'repo-authored');
		assert.equal(lane?.execution?.kind, 'typescript');
	}
	assert.equal(
		manifest.lanes.find((entry) => entry.id === 'tanstack-devtools-pristine-types').execution
			.compiler,
		'tsc',
	);
	assert.equal(
		manifest.lanes.find((entry) => entry.id === 'tanstack-devtools-adapted-types').execution
			.compiler,
		'tsrx-tsc',
	);
	const inventories = verifyTypeInventories(root);
	assert.equal(inventories.pairs, 1);
	assert.ok(inventories.assertions > 0);
});
