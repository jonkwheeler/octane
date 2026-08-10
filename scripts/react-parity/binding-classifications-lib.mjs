import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

const DISPOSITIONS = new Set([
	'unmodified-upstream-suite-wrapper',
	'adapted-upstream-suite',
	'react-octane-differential',
	'octane-only-divergence',
	'octane-only-framework-contract',
]);

// Bindings whose authored typetests must appear in the classification ledger so
// adapted/divergence type coverage cannot be silently counted as parity evidence.
const TYPE_TEST_DISCOVERY_BINDINGS = new Set(['tanstack-store']);

function discoverTestFiles(root, binding) {
	const testsRoot = resolve(root, `packages/${binding}/tests`);
	const discovered = readdirSync(testsRoot, { recursive: true, withFileTypes: true })
		.filter(function keepRuntimeTests(entry) {
			return entry.isFile() && /\.test\.(?:ts|tsx|tsrx)$/.test(entry.name);
		})
		.map(function toRepoPath(entry) {
			return relative(root, resolve(entry.parentPath ?? entry.path, entry.name))
				.split(sep)
				.join('/');
		})
		.filter(function excludeUpstreamPorts(path) {
			return !path.includes('/tests/upstream/');
		});
	if (TYPE_TEST_DISCOVERY_BINDINGS.has(binding)) {
		const typetestsRoot = resolve(root, `packages/${binding}/typetests`);
		if (existsSync(typetestsRoot)) {
			for (const entry of readdirSync(typetestsRoot, {
				recursive: true,
				withFileTypes: true,
			})) {
				if (!entry.isFile() || !/\.test-d\.ts$/.test(entry.name)) continue;
				discovered.push(
					relative(root, resolve(entry.parentPath ?? entry.path, entry.name))
						.split(sep)
						.join('/'),
				);
			}
		}
	}
	return discovered.sort();
}

export function verifyPortTestClassifications(root, binding = 'hook-form') {
	const configPath = `packages/${binding}/audit/test-classifications.json`;
	const manifestPath = `packages/${binding}/audit/react-parity.json`;
	const discovered = discoverTestFiles(root, binding);
	const absoluteConfigPath = resolve(root, configPath);
	if (!existsSync(absoluteConfigPath))
		throw new Error(`missing port-test classifications: ${configPath}`);
	const config = JSON.parse(readFileSync(absoluteConfigPath, 'utf8'));
	const manifest = JSON.parse(readFileSync(resolve(root, manifestPath), 'utf8'));
	const divergenceIds = new Set(
		manifest.divergences.map(function id(entry) {
			return entry.id;
		}),
	);
	const declared = config.tests
		.map(function path(entry) {
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
