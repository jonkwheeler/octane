import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

const DISPOSITIONS = new Set([
	'unmodified-upstream-suite-wrapper',
	'adapted-upstream-suite',
	'repo-authored-type-evidence',
	'react-octane-differential',
	'octane-only-divergence',
	'octane-only-framework-contract',
]);

function toPortablePath(root, entry) {
	return relative(root, resolve(entry.parentPath ?? entry.path, entry.name))
		.split(sep)
		.join('/');
}

function discoverTestFiles(rootDir, pattern) {
	if (!existsSync(rootDir)) return [];
	return readdirSync(rootDir, { recursive: true, withFileTypes: true }).filter(
		function keepFiles(entry) {
			return entry.isFile() && pattern.test(entry.name);
		},
	);
}

function upstreamSuiteInventoryFiles(root, binding, manifest) {
	const covered = new Set();
	for (const lane of manifest.lanes ?? []) {
		if (lane.evidenceOrigin !== 'upstream-suite') continue;
		const inventoryPath = lane.execution?.inventory;
		if (typeof inventoryPath !== 'string') continue;
		const absolute = resolve(root, inventoryPath);
		if (!existsSync(absolute)) continue;
		const inventory = JSON.parse(readFileSync(absolute, 'utf8'));
		for (const file of inventory.files ?? []) {
			if (typeof file === 'string') covered.add(file);
		}
	}
	return covered;
}

function hasRepoAuthoredTypeEvidence(manifest) {
	return (manifest.lanes ?? []).some(function isRepoAuthoredType(lane) {
		return (
			(lane.type === 'pristine-types' || lane.type === 'adapted-types') &&
			lane.evidenceOrigin === 'repo-authored'
		);
	});
}

function hasUpstreamSuiteAdaptedEvidence(manifest) {
	return (manifest.lanes ?? []).some(function isUpstreamSuiteAdapted(lane) {
		return lane.type === 'adapted-octane' && lane.evidenceOrigin === 'upstream-suite';
	});
}

export function verifyPortTestClassifications(root, binding = 'hook-form') {
	const configPath = `packages/${binding}/audit/test-classifications.json`;
	const manifestPath = `packages/${binding}/audit/react-parity.json`;
	const testsRoot = resolve(root, `packages/${binding}/tests`);
	const typetestsRoot = resolve(root, `packages/${binding}/typetests`);
	const absoluteConfigPath = resolve(root, configPath);
	if (!existsSync(absoluteConfigPath))
		throw new Error(`missing port-test classifications: ${configPath}`);
	const config = JSON.parse(readFileSync(absoluteConfigPath, 'utf8'));
	const manifest = JSON.parse(readFileSync(resolve(root, manifestPath), 'utf8'));
	const inventoryCovered = upstreamSuiteInventoryFiles(root, binding, manifest);
	const skipInventoryUpstream =
		hasUpstreamSuiteAdaptedEvidence(manifest) && inventoryCovered.size > 0;
	const discovered = discoverTestFiles(testsRoot, /\.test\.(?:ts|tsx|tsrx)$/)
		.map(function mapPath(entry) {
			return toPortablePath(root, entry);
		})
		.filter(function keepPortAuthored(path) {
			if (!path.includes('/tests/upstream/')) return true;
			// Upstream-suite ports prove adapted files via inventory hashes.
			// Repo-authored adapted files must still appear in classifications.
			return !(skipInventoryUpstream && inventoryCovered.has(path));
		});
	if (hasRepoAuthoredTypeEvidence(manifest)) {
		for (const entry of discoverTestFiles(typetestsRoot, /\.test-d\.ts$/)) {
			discovered.push(toPortablePath(root, entry));
		}
	}
	discovered.sort();
	const divergenceIds = new Set(
		(manifest.divergences ?? []).map(function idOf(entry) {
			return entry.id;
		}),
	);
	const declared = config.tests
		.map(function pathOf(entry) {
			return entry.path;
		})
		.sort();
	if (JSON.stringify(discovered) !== JSON.stringify(declared)) {
		throw new Error(`every port-authored ${binding} test must have exactly one classification`);
	}
	for (const entry of config.tests) {
		if (!DISPOSITIONS.has(entry.disposition))
			throw new Error(`${entry.path}: unknown test disposition`);
		if (entry.disposition.startsWith('octane-only-')) {
			if (!entry.reason)
				throw new Error(`${entry.path}: Octane-only tests require an explicit reason`);
			if (entry.oracle)
				throw new Error(`${entry.path}: Octane-only tests must not claim React parity`);
		} else if (!entry.oracle) {
			throw new Error(
				`${entry.path}: React-parity evidence requires a React oracle or upstream citation`,
			);
		}
		if (entry.disposition === 'octane-only-divergence') {
			if (!entry.divergenceId)
				throw new Error(`${entry.path}: divergence tests require a manifest divergence id`);
			if (!divergenceIds.has(entry.divergenceId))
				throw new Error(`${entry.path}: divergence id is not present in the parity manifest`);
		}
	}
	return { tests: discovered.length };
}
