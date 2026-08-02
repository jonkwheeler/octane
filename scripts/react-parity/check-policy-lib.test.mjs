import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	parseReactParityCheckArgs,
	partitionRequiredLanes,
	verifyBrowserDeferral,
} from './check-policy-lib.mjs';

const lanes = [
	{ id: 'runtime', type: 'adapted' },
	{ id: 'interactions', type: 'browser' },
];

test('the default parity check executes required browser lanes', () => {
	const mode = parseReactParityCheckArgs([]);
	assert.deepEqual(partitionRequiredLanes(lanes, mode), { executable: lanes, deferred: [] });
});

test('the explicit lint mode records browser deferral and keeps other lanes executable', () => {
	const mode = parseReactParityCheckArgs(['--defer-browser-lanes']);
	const partition = partitionRequiredLanes(lanes, mode);
	assert.deepEqual(partition.executable, [lanes[0]]);
	assert.deepEqual(partition.deferred, [lanes[1]]);
	assert.doesNotThrow(() => verifyBrowserDeferral(mode, partition.deferred));
	assert.throws(() => verifyBrowserDeferral(mode, []), /did not defer/);
});
