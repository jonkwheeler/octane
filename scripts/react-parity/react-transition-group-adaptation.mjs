#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const pristinePath = resolve(root, 'packages/react-transition-group/audit/pristine-runtime.json');
const adaptedPath = resolve(root, 'packages/react-transition-group/audit/adapted-runtime.json');
const destination = resolve(root, 'packages/react-transition-group/audit/adaptation.json');
const expectedAdaptedNames = [
	'ChildMapping should support mergeChildMappings for adding keys',
	'ChildMapping should support mergeChildMappings for removing keys',
	'ChildMapping should support mergeChildMappings for adding and removing',
	'ChildMapping should reconcile overlapping insertions and deletions',
	'ChildMapping should support mergeChildMappings with undefined input',
];

function identity(test) {
	return `${test.file}\0${test.fullName}`;
}

function upstreamName(test) {
	return test.fullName;
}

export function buildAdaptationInventory(pristine, adapted) {
	if (pristine.tests.length !== 56) {
		throw new Error(`Expected 56 pristine cases, received ${pristine.tests.length}`);
	}
	const suites = new Set(
		pristine.tests.map(function pristineFile(test) {
			return test.file;
		}),
	);
	if (suites.size !== 7) throw new Error(`Expected 7 pristine suites, received ${suites.size}`);

	const pristineByName = new Map();
	for (const test of pristine.tests) {
		const name = upstreamName(test);
		if (pristineByName.has(name)) throw new Error(`Duplicate pristine identity: ${name}`);
		pristineByName.set(name, test);
	}

	const adaptedNames = new Set();
	for (const test of adapted.tests) {
		const name = upstreamName(test);
		if (!pristineByName.has(name))
			throw new Error(`Adapted case has no upstream identity: ${name}`);
		if (adaptedNames.has(name)) throw new Error(`Duplicate adapted identity: ${name}`);
		adaptedNames.add(name);
	}
	for (const name of expectedAdaptedNames) {
		if (!adaptedNames.has(name)) throw new Error(`Missing required adapted identity: ${name}`);
	}

	const cases = pristine.tests.map(function classify(test) {
		const base = {
			id: identity(test),
			upstreamFile: test.file,
			fullName: test.fullName,
		};
		if (adaptedNames.has(test.fullName)) {
			return {
				...base,
				disposition: 'adapted',
				adaptedFile: 'packages/react-transition-group/tests/adapted/ChildMapping.test.ts',
			};
		}
		if (
			test.fullName === 'Transition should use `React.findDOMNode` when `nodeRef` is not provided'
		) {
			return {
				...base,
				disposition: 'not-applicable',
				reason:
					'Octane has no class instances or findDOMNode API; nodeRef is the supported node identity path.',
			};
		}
		return {
			...base,
			disposition: 'pending-adaptation',
			reason: 'Not yet ported one-for-one in this parity-scaffolding pass.',
		};
	});

	return {
		schemaVersion: 1,
		upstreamCases: pristine.tests.length,
		adaptedCases: adaptedNames.size,
		notApplicableCases: cases.filter(function notApplicable(entry) {
			return entry.disposition === 'not-applicable';
		}).length,
		pendingCases: cases.filter(function pending(entry) {
			return entry.disposition === 'pending-adaptation';
		}).length,
		permittedTransforms: [
			'import React APIs from Octane equivalents',
			're-author JSX component fixtures as .tsrx function components',
			'replace React Testing Library mounting with Octane test helpers',
			'replace legacy class instances and findDOMNode with nodeRef when behavior remains observable',
			'preserve upstream describe and test titles exactly',
		],
		cases,
	};
}

if (process.argv.includes('--write')) {
	const pristine = JSON.parse(readFileSync(pristinePath, 'utf8'));
	const adapted = JSON.parse(readFileSync(adaptedPath, 'utf8'));
	const inventory = buildAdaptationInventory(pristine, adapted);
	writeFileSync(destination, `${JSON.stringify(inventory, null, 2)}\n`);
	console.log(
		`packages/react-transition-group/audit/adaptation.json: ${inventory.adaptedCases} adapted, ${inventory.notApplicableCases} not applicable, ${inventory.pendingCases} pending`,
	);
}
