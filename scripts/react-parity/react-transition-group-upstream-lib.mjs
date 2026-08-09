import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

import { extractTestCases } from './inventory-lib.mjs';

const PACKAGE_ROOT = 'packages/react-transition-group';
const UPSTREAM_ROOT = `${PACKAGE_ROOT}/upstream`;
const UPSTREAM_TEST_ROOT = `${UPSTREAM_ROOT}/test`;
const INVENTORY_PATH = `${PACKAGE_ROOT}/audit/SHA256SUMS`;
const DISPOSITION_PATH = `${PACKAGE_ROOT}/audit/upstream-test-dispositions.json`;

const SUPPORT_ARTIFACTS = new Set(['.eslintrc.yml', 'setup.js', 'setupAfterEnv.js', 'utils.js']);

function filesBelow(root) {
	return readdirSync(root, { recursive: true, withFileTypes: true })
		.filter(function keepFiles(entry) {
			return entry.isFile();
		})
		.map(function absolutePath(entry) {
			return resolve(entry.parentPath ?? entry.path, entry.name);
		})
		.sort();
}

function portableRelative(root, file) {
	return relative(root, file).split(sep).join('/');
}

export function renderReactTransitionGroupUpstreamInventory(repoRoot) {
	const upstreamRoot = resolve(repoRoot, UPSTREAM_ROOT);
	return `${filesBelow(upstreamRoot)
		.map(function lineFor(file) {
			const digest = createHash('sha256').update(readFileSync(file)).digest('hex');
			return `${digest}  upstream/${portableRelative(upstreamRoot, file)}`;
		})
		.join('\n')}\n`;
}

export function listUpstreamTestArtifacts(repoRoot) {
	const testRoot = resolve(repoRoot, UPSTREAM_TEST_ROOT);
	return filesBelow(testRoot).map(function relativePath(file) {
		return portableRelative(testRoot, file);
	});
}

export function listUpstreamTestFiles(repoRoot) {
	return listUpstreamTestArtifacts(repoRoot).filter(function isSuite(file) {
		return file.endsWith('-test.js');
	});
}

export function collectUpstreamCaseInventory(repoRoot) {
	const testRoot = resolve(repoRoot, UPSTREAM_TEST_ROOT);
	const cases = [];
	for (const file of listUpstreamTestFiles(repoRoot)) {
		const source = readFileSync(resolve(testRoot, file), 'utf8');
		for (const entry of extractTestCases(source, { file })) {
			cases.push({
				file: `test/${file}`,
				title: entry.title,
			});
		}
	}
	return cases.sort(function compareCases(left, right) {
		return left.file.localeCompare(right.file) || left.title.localeCompare(right.title);
	});
}

export function verifyReactTransitionGroupUpstream(repoRoot) {
	const expectedInventory = readFileSync(resolve(repoRoot, INVENTORY_PATH), 'utf8');
	const actualInventory = renderReactTransitionGroupUpstreamInventory(repoRoot);
	if (actualInventory !== expectedInventory) {
		throw new Error('react-transition-group upstream inventory drifted; re-vendor the pinned tag');
	}

	const dispositions = JSON.parse(readFileSync(resolve(repoRoot, DISPOSITION_PATH), 'utf8'));
	if (dispositions.schemaVersion !== 1 || !Array.isArray(dispositions.artifacts)) {
		throw new Error('upstream-test-dispositions.json must declare schemaVersion 1 artifacts');
	}

	const artifacts = listUpstreamTestArtifacts(repoRoot);
	const dispositionPaths = dispositions.artifacts.map(function pathOf(entry) {
		return entry.path;
	});
	if (
		JSON.stringify(dispositionPaths.slice().sort()) !== JSON.stringify(artifacts.slice().sort())
	) {
		throw new Error(
			'react-transition-group upstream test dispositions must account for every upstream/test artifact',
		);
	}

	const suiteFiles = listUpstreamTestFiles(repoRoot);
	for (const entry of dispositions.artifacts) {
		if (typeof entry.path !== 'string' || typeof entry.disposition !== 'string') {
			throw new Error(
				`${entry.path ?? '<missing>'}: disposition entries require path and disposition`,
			);
		}
		if (SUPPORT_ARTIFACTS.has(entry.path)) {
			if (entry.disposition !== 'support') {
				throw new Error(`${entry.path}: support artifacts must use disposition "support"`);
			}
			continue;
		}
		if (!suiteFiles.includes(entry.path)) {
			throw new Error(`${entry.path}: unknown upstream test artifact disposition`);
		}
		const allowed = new Set([
			'pristine-oracle',
			'pristine-oracle-partially-adapted',
			'pristine-oracle-adapted',
			'not-applicable',
		]);
		if (!allowed.has(entry.disposition)) {
			throw new Error(
				`${entry.path}: suite disposition must be a pristine oracle classification or not-applicable`,
			);
		}
		if (typeof entry.rationale !== 'string' || entry.rationale.length === 0) {
			throw new Error(`${entry.path}: disposition requires a rationale`);
		}
		if (!Number.isInteger(entry.caseCount) || entry.caseCount < 0) {
			throw new Error(`${entry.path}: disposition requires a non-negative caseCount`);
		}
		if (
			(entry.disposition === 'pristine-oracle-adapted' ||
				entry.disposition === 'pristine-oracle-partially-adapted') &&
			(!Array.isArray(entry.adaptedEvidence) || entry.adaptedEvidence.length === 0)
		) {
			throw new Error(`${entry.path}: adapted dispositions require adaptedEvidence`);
		}
	}

	const inventoriedCases = collectUpstreamCaseInventory(repoRoot);
	const expectedCaseCount = dispositions.artifacts
		.filter(function suitesOnly(entry) {
			return !SUPPORT_ARTIFACTS.has(entry.path);
		})
		.reduce(function sum(total, entry) {
			return total + entry.caseCount;
		}, 0);
	if (inventoriedCases.length !== expectedCaseCount) {
		throw new Error(
			`upstream case inventory drifted: found ${inventoriedCases.length} cases, dispositions declare ${expectedCaseCount}`,
		);
	}

	for (const entry of dispositions.artifacts.filter(function suitesOnly(item) {
		return !SUPPORT_ARTIFACTS.has(item.path);
	})) {
		const actual = inventoriedCases.filter(function forFile(item) {
			return item.file === `test/${entry.path}`;
		}).length;
		if (actual !== entry.caseCount) {
			throw new Error(
				`${entry.path}: disposition caseCount ${entry.caseCount} does not match ${actual} extracted cases`,
			);
		}
	}

	return {
		artifacts: artifacts.length,
		cases: inventoriedCases.length,
	};
}
