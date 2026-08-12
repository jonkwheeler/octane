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

test('accepts one leading pnpm argument separator', () => {
	assert.deepEqual(parseArguments(['--', '--batch', 'fixture']), {
		workRoot: '.react-port-work',
		batch: 'fixture',
	});
});

test('reports unfinished requested targets and actionable graph prerequisites', () => {
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
	assert.deepEqual(report.unfinished, ['dependency', 'implementing', 'pending', 'ready']);
	assert.deepEqual(
		report.nextActions.map(({ nodeId, kind }) => ({ nodeId, kind })),
		[
			{ nodeId: 'dependency', kind: 'implement' },
			{ nodeId: 'implementing', kind: 'complete-evidence' },
			{ nodeId: 'pending', kind: 'resolve-intake' },
			{ nodeId: 'ready', kind: 'implement' },
		],
	);
	assert.deepEqual(report.nextActions[1].gates, ['browser', 'package-tests']);
});

test('emits deterministic, redacted implementation packets in graph order', () => {
	const feasibility = {
		verdict: 'bridgeable-with-rewrites',
		requiresAdaptation: true,
		classComponents: true,
		plan: ['Rewrite public classes as Octane function components.'],
	};
	const cleanRoom = {
		copySource: false,
		copyTests: false,
		requirement: 'Independently re-author the required public behavior.',
	};
	const report = terminalBatchReport({
		schemaVersion: 1,
		batchId: 'fixture',
		executionUnits: [['pkg:clean-room'], ['pkg:prerequisite'], ['pkg:widget']],
		actionableExecutionUnits: [['pkg:prerequisite'], ['pkg:widget']],
		executionOrder: ['pkg:clean-room', 'pkg:prerequisite', 'pkg:widget'],
		nodes: {
			'pkg:widget': node('pkg:widget', {
				packageName: 'react-widget',
				state: 'ready',
				disposition: 'actionable',
				action: 'create-binding',
				identity: {
					packageName: 'react-widget',
					version: '1.0.0',
					commit: 'a'.repeat(40),
					repository: 'https://operator:secret@github.com/example/react-widget',
					token: 'github_pat_not-for-terminal-output',
				},
				binding: '@octanejs/widget',
				bindingDirectory: 'packages/widget',
				dependsOn: ['pkg:clean-room', 'pkg:prerequisite'],
				constraints: [{ range: '1.0.0', via: 'react-widget' }],
				requiredSubpaths: ['.'],
				vanillaCore: null,
				feasibility,
			}),
			'pkg:clean-room': node('pkg:clean-room', {
				requested: false,
				packageName: 'react-helper',
				state: 'verified',
				disposition: 'satisfied',
				action: 'reimplement-in-parent',
				copyPermission: 'denied-or-unproven',
				reimplementation: cleanRoom,
			}),
			'pkg:prerequisite': node('pkg:prerequisite', {
				requested: false,
				packageName: 'react-prerequisite',
				state: 'ready',
				disposition: 'actionable',
				action: 'create-binding',
				identity: { packageName: 'react-prerequisite', version: '2.0.0' },
				binding: '@octanejs/prerequisite',
				bindingDirectory: 'packages/prerequisite',
			}),
		},
	});

	assert.deepEqual(
		report.nextActions.map(({ nodeId }) => nodeId),
		['pkg:prerequisite', 'pkg:widget'],
	);
	const action = report.nextActions[1];
	assert.equal(action.kind, 'implement');
	assert.equal(action.action, 'create-binding');
	assert.equal(action.packageName, 'react-widget');
	assert.equal(action.identity.version, '1.0.0');
	assert.equal(action.identity.token, '[REDACTED]');
	assert.equal(action.identity.repository, 'https://github.com/example/react-widget');
	assert.equal(action.binding, '@octanejs/widget');
	assert.equal(action.bindingDirectory, 'packages/widget');
	assert.deepEqual(action.dependsOn, ['pkg:clean-room', 'pkg:prerequisite']);
	assert.deepEqual(action.execution, {
		index: 2,
		unitIndex: 2,
		unit: ['pkg:widget'],
	});
	assert.deepEqual(action.feasibility, feasibility);
	assert.deepEqual(action.dependencies[0].reimplementation, cleanRoom);
	assert.equal(action.dependencies[0].copyPermission, 'denied-or-unproven');
	assert.equal(action.dependencies[1].binding, '@octanejs/prerequisite');
	assert.equal(Object.hasOwn(action, 'command'), false);
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
