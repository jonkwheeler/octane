import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

const DISPOSITIONS = new Set([
	'unmodified-upstream-suite-wrapper',
	'adapted-upstream-suite',
	'pristine-upstream-suite',
	'react-octane-differential',
	'octane-only-divergence',
	'octane-only-framework-contract',
	'octane-only-audit-contract',
	'repo-authored-pristine-types',
	'repo-authored-adapted-types',
]);

function isPortAuthoredTestPath(path) {
	return !path.includes('/tests/upstream/');
}

function toPortable(path) {
	return path.split(sep).join('/');
}

function defaultDiscoveryRoots(binding) {
	return [
		{
			root: `packages/${binding}/tests`,
			include: '\\.test\\.(?:ts|tsx|tsrx)$',
		},
	];
}

function discoverFromRoots(root, discoveryRoots) {
	const discovered = [];
	for (const entry of discoveryRoots) {
		const absoluteRoot = resolve(root, entry.root);
		if (!existsSync(absoluteRoot)) continue;
		const include = new RegExp(entry.include);
		for (const file of readdirSync(absoluteRoot, { recursive: true, withFileTypes: true })) {
			if (!file.isFile()) continue;
			const relativePath = toPortable(
				relative(root, resolve(file.parentPath ?? file.path, file.name)),
			);
			if (!include.test(relativePath) && !include.test(file.name)) continue;
			discovered.push(relativePath);
		}
	}
	return discovered.filter(isPortAuthoredTestPath).sort();
}

export function verifyPortTestClassifications(root, binding = 'hook-form') {
	const configPath = `packages/${binding}/audit/test-classifications.json`;
	const manifestPath = `packages/${binding}/audit/react-parity.json`;
	const absoluteConfigPath = resolve(root, configPath);
	if (!existsSync(absoluteConfigPath))
		throw new Error(`missing port-test classifications: ${configPath}`);
	const config = JSON.parse(readFileSync(absoluteConfigPath, 'utf8'));
	const discoveryRoots = Array.isArray(config.discoveryRoots)
		? config.discoveryRoots
		: defaultDiscoveryRoots(binding);
	const discovered = discoverFromRoots(root, discoveryRoots);
	const manifest = JSON.parse(readFileSync(resolve(root, manifestPath), 'utf8'));
	const divergenceIds = new Set(
		manifest.divergences.map(function id(entry) {
			return entry.id;
		}),
	);
	// Vendored upstream suites may also be classified for binding-local control
	// tests; the generic port-authored audit compares only non-upstream paths.
	const declared = config.tests
		.map(function path(entry) {
			return entry.path;
		})
		.filter(isPortAuthoredTestPath)
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
