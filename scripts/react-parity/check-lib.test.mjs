import assert from 'node:assert/strict';
import test from 'node:test';
import { runRequiredBindingLanes } from './check-lib.mjs';

test('runs required lanes for recorded-unverified manifests', () => {
	const calls = [];
	runRequiredBindingLanes({
		relativeFile: 'packages/example/audit/react-parity.json',
		harnessPath: '/repo/scripts/react-parity/harness.mjs',
		repo: '/repo',
		execFile: (...args) => calls.push(args),
	});
	assert.deepEqual(calls[0][1], [
		'/repo/scripts/react-parity/harness.mjs',
		'run-required',
		'--manifest',
		'packages/example/audit/react-parity.json',
	]);
});

test('propagates a required lane failure', () => {
	assert.throws(
		() =>
			runRequiredBindingLanes({
				relativeFile: 'packages/example/audit/react-parity.json',
				harnessPath: '/repo/scripts/react-parity/harness.mjs',
				repo: '/repo',
				execFile: () => {
					throw new Error('lane failed');
				},
			}),
		/lane failed/,
	);
});
