import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAdaptationInventory } from './react-transition-group-adaptation.mjs';

function pristineFixture() {
	const names = [
		'ChildMapping should support mergeChildMappings for adding keys',
		'ChildMapping should support mergeChildMappings for removing keys',
		'ChildMapping should support mergeChildMappings for adding and removing',
		'ChildMapping should reconcile overlapping insertions and deletions',
		'ChildMapping should support mergeChildMappings with undefined input',
	];
	const tests = [];
	for (let index = 0; index < 56; index += 1) {
		tests.push({
			file: `test/suite-${index % 7}.js`,
			fullName:
				index === 55
					? 'Transition should use `React.findDOMNode` when `nodeRef` is not provided'
					: (names[index] ?? `Suite case ${index}`),
			status: 'passed',
		});
	}
	return { tests };
}

function adaptedFixture() {
	return {
		tests: pristineFixture().tests.filter(function applicable(test) {
			return (
				test.fullName !== 'Transition should use `React.findDOMNode` when `nodeRef` is not provided'
			);
		}),
	};
}

test('rejects a removed pristine case', function rejectRemovedCase() {
	const pristine = pristineFixture();
	pristine.tests.pop();
	assert.throws(function buildInvalidInventory() {
		buildAdaptationInventory(pristine, adaptedFixture());
	}, /Expected 56 pristine cases/);
});

test('rejects an adapted case without an upstream identity', function rejectUnknownCase() {
	assert.throws(function buildInvalidInventory() {
		buildAdaptationInventory(pristineFixture(), {
			tests: [...adaptedFixture().tests, { file: 'adapted.test.ts', fullName: 'unknown case' }],
		});
	}, /has no upstream identity/);
});

test('rejects duplicate adapted identities', function rejectDuplicateCase() {
	const adaptedCase = adaptedFixture().tests[0];
	assert.throws(function buildInvalidInventory() {
		buildAdaptationInventory(pristineFixture(), {
			tests: [...adaptedFixture().tests, adaptedCase],
		});
	}, /Duplicate adapted identity/);
});

test('rejects a removed required adapted case', function rejectRemovedAdaptation() {
	const adapted = adaptedFixture();
	adapted.tests.pop();
	assert.throws(function buildInvalidInventory() {
		buildAdaptationInventory(pristineFixture(), adapted);
	}, /Missing required adapted identity/);
});
