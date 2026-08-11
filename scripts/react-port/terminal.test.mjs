import assert from 'node:assert/strict';
import { test } from 'node:test';
import { terminalBatchReport } from './terminal.mjs';

function node(id, { requested = true, state, disposition }) {
	return { id, requested, state, disposition, dependsOn: [] };
}

test('rejects requested targets that have not reached a terminal disposition', () => {
	const report = terminalBatchReport({
		schemaVersion: 1,
		batchId: 'fixture',
		nodes: {
			ready: node('ready', { state: 'ready', disposition: 'actionable' }),
			pending: node('pending', { state: 'blocked', disposition: 'pending-intake' }),
			dependency: node('dependency', {
				requested: false,
				state: 'ready',
				disposition: 'actionable',
			}),
		},
	});

	assert.equal(report.status, 'unfinished');
	assert.deepEqual(report.unfinished, ['ready', 'pending']);
});

test('accepts only verified, satisfied, or hard-blocked requested targets', () => {
	const report = terminalBatchReport({
		schemaVersion: 1,
		batchId: 'fixture',
		nodes: {
			verified: node('verified', { state: 'verified', disposition: 'actionable' }),
			satisfied: node('satisfied', { state: 'verified', disposition: 'satisfied' }),
			hard: node('hard', { state: 'blocked', disposition: 'hard-blocked' }),
		},
	});

	assert.equal(report.status, 'terminal');
	assert.deepEqual(report.unfinished, []);
	assert.deepEqual(
		report.requested.map(({ disposition }) => disposition),
		['verified', 'satisfied', 'hard-blocked'],
	);
});
