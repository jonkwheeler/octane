import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

const DISPOSITIONS = new Set([
	'unmodified-upstream-suite-wrapper',
	'react-octane-differential',
	'octane-only-divergence',
	'octane-only-framework-contract',
]);

function discoverAuthoredTests(root, binding) {
	const packageRoot = resolve(root, `packages/${binding}`);
	const discovered = [];
	const testsRoot = resolve(packageRoot, 'tests');
	if (existsSync(testsRoot)) {
		for (const entry of readdirSync(testsRoot, { recursive: true, withFileTypes: true })) {
			if (!entry.isFile() || !/\.test\.(?:ts|tsx|tsrx)$/.test(entry.name)) continue;
			const path = relative(root, resolve(entry.parentPath ?? entry.path, entry.name))
				.split(sep)
				.join('/');
			if (path.includes('/tests/upstream/')) continue;
			discovered.push(path);
		}
	}
	// Type-parity ledgers already inventory adapted typetests; discover
	// `*.test-d.ts` only when that separate ledger is absent so they cannot
	// silently enter a parity compiler lane later.
	const typetestsRoot = resolve(packageRoot, 'typetests');
	if (existsSync(typetestsRoot) && !existsSync(resolve(packageRoot, 'audit/type-parity.json'))) {
		for (const entry of readdirSync(typetestsRoot, { recursive: true, withFileTypes: true })) {
			if (!entry.isFile() || !/\.test-d\.ts$/.test(entry.name)) continue;
			discovered.push(
				relative(root, resolve(entry.parentPath ?? entry.path, entry.name))
					.split(sep)
					.join('/'),
			);
		}
	}
	return discovered.sort();
}

export function verifyPortTestClassifications(root, binding = 'hook-form') {
	const configPath = `packages/${binding}/audit/test-classifications.json`;
	const manifestPath = `packages/${binding}/audit/react-parity.json`;
	const discovered = discoverAuthoredTests(root, binding);
	const absoluteConfigPath = resolve(root, configPath);
	if (!existsSync(absoluteConfigPath))
		throw new Error(`missing port-test classifications: ${configPath}`);
	const config = JSON.parse(readFileSync(absoluteConfigPath, 'utf8'));
	const manifest = JSON.parse(readFileSync(resolve(root, manifestPath), 'utf8'));
	const divergenceIds = new Set(manifest.divergences.map((entry) => entry.id));
	const declared = config.tests.map((entry) => entry.path).sort();
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
