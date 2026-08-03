import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import test from 'node:test';
import { verifyLaneCollectedTests } from './harness-lib.mjs';

const root = new URL('../..', import.meta.url).pathname;
const manifest = JSON.parse(
	readFileSync(new URL('../../packages/dnd-kit/audit/react-parity.json', import.meta.url), 'utf8'),
);

test('dnd-kit classifies every port-authored test exactly once', () => {
	const discovered = readdirSync(resolve(root, 'packages/dnd-kit/tests'), {
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
			new URL('../../packages/dnd-kit/audit/test-classifications.json', import.meta.url),
			'utf8',
		),
	)
		.tests.map((entry) => entry.path)
		.sort();
	assert.deepEqual(discovered, declared);
});

test('dnd-kit differential lane rejects a renamed declared case', () => {
	const lane = manifest.lanes.find((entry) => entry.id === 'dnd-kit-runtime-differential');
	const collected = lane.files
		.filter((file) => file.role === 'test')
		.flatMap((file) =>
			file.cases.map((entry) => ({
				file: new URL(`../../${file.path}`, import.meta.url).pathname,
				name: `${entry.fullName} renamed`,
			})),
		);
	assert.throws(
		() => verifyLaneCollectedTests(lane, collected, root),
		/fullName must match exactly one collected Vitest test/,
	);
});
