import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { extractTestCases } from './inventory-lib.mjs';
import { verifyTanstackStoreUpstream } from '../../packages/tanstack-store/scripts/verify-upstream.mjs';

const UPSTREAM_TEST = 'packages/tanstack-store/upstream/tests/index.test.tsx';
const ADAPTED_FIXTURE = 'packages/tanstack-store/tests/_fixtures/upstream/index.tsrx';
const PRISTINE_INVENTORY = 'packages/tanstack-store/audit/pristine-runtime.json';
const ADAPTED_INVENTORY = 'packages/tanstack-store/audit/adapted-runtime.json';
const OMITTED_PREFIX = '_useStore ';

function readInventory(repoRoot, relativePath) {
	return JSON.parse(readFileSync(resolve(repoRoot, relativePath), 'utf8'));
}

function registrationCount(source, file) {
	return extractTestCases(source, { file }).length;
}

export function verifyTanstackStoreUpstreamEvidence(repoRoot) {
	verifyTanstackStoreUpstream(resolve(repoRoot, 'packages/tanstack-store'));
	const upstreamSource = readFileSync(resolve(repoRoot, UPSTREAM_TEST), 'utf8');
	const adaptedSource = readFileSync(resolve(repoRoot, ADAPTED_FIXTURE), 'utf8');
	const upstreamCount = registrationCount(upstreamSource, UPSTREAM_TEST);
	const adaptedCount = registrationCount(adaptedSource, ADAPTED_FIXTURE);
	if (upstreamCount !== 32) {
		throw new Error(`tanstack-store upstream suite must register 32 runtime cases, found ${upstreamCount}`);
	}
	if (adaptedCount !== 30) {
		throw new Error(`tanstack-store adapted fixture must register 30 runtime cases, found ${adaptedCount}`);
	}

	const pristine = readInventory(repoRoot, PRISTINE_INVENTORY);
	const adaptedInventory = readInventory(repoRoot, ADAPTED_INVENTORY);
	const pristineNames = new Set(
		pristine.tests.map(function name(testCase) {
			return testCase.fullName;
		}),
	);
	const adaptedNames = new Set(
		adaptedInventory.tests.map(function name(testCase) {
			return testCase.fullName;
		}),
	);
	const omitted = [...pristineNames].filter(function isOmitted(fullName) {
		return fullName.startsWith(OMITTED_PREFIX);
	});
	const expectedAdapted = [...pristineNames].filter(function keepAdapted(fullName) {
		return !fullName.startsWith(OMITTED_PREFIX);
	});
	if (omitted.length !== 2) {
		throw new Error('tanstack-store pristine inventory must retain exactly two _useStore identities');
	}
	if (pristine.tests.length !== upstreamCount) {
		throw new Error('tanstack-store pristine inventory must list every upstream runtime identity');
	}
	if (adaptedInventory.tests.length !== adaptedCount) {
		throw new Error('tanstack-store adapted inventory must list every adapted runtime identity');
	}
	for (const fullName of expectedAdapted) {
		if (!adaptedNames.has(fullName)) {
			throw new Error(`tanstack-store adapted inventory omitted paired identity: ${fullName}`);
		}
	}
	for (const fullName of omitted) {
		if (adaptedNames.has(fullName)) {
			throw new Error(`tanstack-store adapted inventory must omit _useStore identity: ${fullName}`);
		}
	}
	if (adaptedNames.size !== expectedAdapted.length) {
		throw new Error('tanstack-store adapted inventory contains unexpected identities');
	}

	return {
		upstreamCases: upstreamCount,
		adaptedCases: adaptedCount,
		omittedCases: omitted.length,
	};
}
