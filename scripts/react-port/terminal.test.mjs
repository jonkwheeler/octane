import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseArguments, terminalBatchReport } from './terminal.mjs';

function node(id, { requested = true, state, disposition, ...rest }) {
	return { id, requested, state, disposition, dependsOn: [], ...rest };
}

test('rejects path traversal and separators in batch identifiers', () => {
	for (const batch of ['../escape', 'nested/escape', String.raw`nested\escape`]) {
		assert.throws(
			() => parseArguments(['--batch', batch]),
			/--batch requires a path-safe identifier/,
		);
	}
});

test('rejects requested targets that have not reached a terminal disposition', () => {
	const report = terminalBatchReport({
		schemaVersion: 1,
		batchId: 'fixture',
		nodes: {
			ready: node('ready', { state: 'ready', disposition: 'actionable' }),
			pending: node('pending', {
				state: 'blocked',
				disposition: 'pending-intake',
				action: 'audit-dependency',
				repair: 'Classify the shipped dependency.',
			}),
			implementing: node('implementing', {
				state: 'implementing',
				disposition: 'actionable',
				action: 'create-binding',
				evidenceMatrix: {
					gates: {
						typecheck: { status: 'passed' },
						'package-tests': { status: 'required' },
						browser: { status: 'failed' },
					},
				},
			}),
			dependency: node('dependency', {
				requested: false,
				state: 'ready',
				disposition: 'actionable',
			}),
		},
	});

	assert.equal(report.status, 'unfinished');
	assert.deepEqual(report.unfinished, ['ready', 'pending', 'implementing']);
	assert.deepEqual(report.nextActions, [
		{ nodeId: 'ready', kind: 'implement', action: null },
		{
			nodeId: 'pending',
			kind: 'resolve-intake',
			action: 'audit-dependency',
			repair: 'Classify the shipped dependency.',
		},
		{
			nodeId: 'implementing',
			kind: 'complete-evidence',
			gates: ['browser', 'package-tests'],
		},
	]);
});

test('accepts verified, satisfied, and immutable hard-blocks but queues binding adoption', () => {
	const report = terminalBatchReport({
		schemaVersion: 1,
		batchId: 'fixture',
		nodes: {
			verified: node('verified', { state: 'verified', disposition: 'actionable' }),
			satisfied: node('satisfied', { state: 'verified', disposition: 'satisfied' }),
			hard: node('hard', { state: 'blocked', disposition: 'hard-blocked' }),
			collision: node('collision', {
				state: 'blocked',
				disposition: 'hard-blocked',
				action: 'binding-name-conflict',
				collisionKind: 'adoptable-binding',
			}),
		},
	});

	assert.equal(report.status, 'unfinished');
	assert.deepEqual(report.unfinished, ['collision']);
	assert.equal(report.nextActions[0].kind, 'resolve-collision');
	assert.deepEqual(
		report.requested.map(({ disposition }) => disposition),
		['verified', 'satisfied', 'hard-blocked', 'hard-blocked'],
	);
});

test('accepts non-adoptable binding conflicts as terminal hard blocks', () => {
	const report = terminalBatchReport({
		schemaVersion: 1,
		batchId: 'fixture',
		nodes: {
			batchConflict: node('batchConflict', {
				state: 'blocked',
				disposition: 'hard-blocked',
				action: 'binding-name-conflict',
				collisionKind: 'batch-binding-name',
			}),
		},
	});

	assert.equal(report.status, 'terminal');
	assert.deepEqual(report.nextActions, []);
});
