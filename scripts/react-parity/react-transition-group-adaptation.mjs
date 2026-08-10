#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const pristinePath = resolve(root, 'packages/react-transition-group/audit/pristine-runtime.json');
const adaptedPaths = [
	resolve(root, 'packages/react-transition-group/audit/adapted-runtime.json'),
	resolve(root, 'packages/react-transition-group/audit/adapted-runtime-ssr.json'),
];
const destination = resolve(root, 'packages/react-transition-group/audit/adaptation.json');
const findDOMNodeCase = 'Transition should use `React.findDOMNode` when `nodeRef` is not provided';

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

	const adaptedByName = new Map();
	for (const test of adapted.tests) {
		const name = upstreamName(test);
		if (!pristineByName.has(name))
			throw new Error(`Adapted case has no upstream identity: ${name}`);
		if (adaptedByName.has(name)) throw new Error(`Duplicate adapted identity: ${name}`);
		adaptedByName.set(name, test);
	}
	for (const name of pristineByName.keys()) {
		if (name !== findDOMNodeCase && !adaptedByName.has(name)) {
			throw new Error(`Missing required adapted identity: ${name}`);
		}
	}

	const cases = pristine.tests.map(function classify(test) {
		const base = {
			id: identity(test),
			upstreamFile: test.file,
			fullName: test.fullName,
		};
		const adaptedTest = adaptedByName.get(test.fullName);
		if (adaptedTest) {
			return {
				...base,
				disposition: 'adapted',
				adaptedFile: adaptedTest.file,
			};
		}
		if (test.fullName === findDOMNodeCase) {
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
		adaptedCases: adaptedByName.size,
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
	const adapted = {
		tests: adaptedPaths.flatMap(function loadAdaptedInventory(path) {
			return JSON.parse(readFileSync(path, 'utf8')).tests;
		}),
	};
	const inventory = buildAdaptationInventory(pristine, adapted);
	writeFileSync(destination, `${JSON.stringify(inventory, null, 2)}\n`);
	console.log(
		`packages/react-transition-group/audit/adaptation.json: ${inventory.adaptedCases} adapted, ${inventory.notApplicableCases} not applicable, ${inventory.pendingCases} pending`,
	);
}
