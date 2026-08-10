import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

const DISPOSITIONS = new Set([
	'unmodified-upstream-suite-wrapper',
	'adapted-upstream-suite',
	'react-octane-differential',
	'octane-only-divergence',
	'octane-only-framework-contract',
]);

function portablePath(root, entry) {
	return relative(root, resolve(entry.parentPath ?? entry.path, entry.name))
		.split(sep)
		.join('/');
}

function isTestFile(entry) {
	return entry.isFile() && /\.test\.(?:ts|tsx|tsrx)$/.test(entry.name);
}

function isTypetestProgram(entry) {
	return entry.isFile() && /\.(?:ts|tsx|tsrx)$/.test(entry.name);
}

function keepDiscoveredTest(path, includeUpstream) {
	return includeUpstream || !path.includes('/tests/upstream/');
}

function discoverTestFiles(root, binding, includeUpstream) {
	const testsRoot = resolve(root, `packages/${binding}/tests`);
	return readdirSync(testsRoot, { recursive: true, withFileTypes: true })
		.filter(isTestFile)
		.map(function toPortable(entry) {
			return portablePath(root, entry);
		})
		.filter(function maybeKeepUpstream(path) {
			return keepDiscoveredTest(path, includeUpstream);
		})
		.sort();
}

function discoverTypetestPrograms(root, binding) {
	const typetestsRoot = resolve(root, `packages/${binding}/typetests`);
	if (!existsSync(typetestsRoot)) return [];
	return readdirSync(typetestsRoot, { recursive: true, withFileTypes: true })
		.filter(isTypetestProgram)
		.map(function toPortable(entry) {
			return portablePath(root, entry);
		})
		.sort();
}

export function verifyPortTestClassifications(root, binding = 'hook-form', options = {}) {
	const includeUpstream = options.includeUpstream === true;
	const includeTypetests = options.includeTypetests === true;
	const configPath = `packages/${binding}/audit/test-classifications.json`;
	const manifestPath = `packages/${binding}/audit/react-parity.json`;
	const discovered = [
		...discoverTestFiles(root, binding, includeUpstream),
		...(includeTypetests ? discoverTypetestPrograms(root, binding) : []),
	].sort();
	const absoluteConfigPath = resolve(root, configPath);
	if (!existsSync(absoluteConfigPath))
		throw new Error(`missing port-test classifications: ${configPath}`);
	const config = JSON.parse(readFileSync(absoluteConfigPath, 'utf8'));
	const manifest = JSON.parse(readFileSync(resolve(root, manifestPath), 'utf8'));
	const divergenceIds = new Set(
		manifest.divergences.map(function idOf(entry) {
			return entry.id;
		}),
	);
	const declared = config.tests
		.map(function pathOf(entry) {
			return entry.path;
		})
		.sort();
	if (JSON.stringify(discovered) !== JSON.stringify(declared))
		throw new Error(`every port-authored ${binding} test must have exactly one classification`);
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
			const classifiedDivergences = entry.divergenceIds ?? [entry.divergenceId].filter(Boolean);
			if (!classifiedDivergences.length)
				throw new Error(`${entry.path}: divergence tests require a manifest divergence id`);
			for (const divergenceId of classifiedDivergences)
				if (!divergenceIds.has(divergenceId))
					throw new Error(`${entry.path}: divergence id is not present in the parity manifest`);
		}
	}
	return { tests: discovered.length };
}
