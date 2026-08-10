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
]);

function toPortablePath(root, entry) {
	return relative(root, resolve(entry.parentPath ?? entry.path, entry.name))
		.split(sep)
		.join('/');
}

function listTestFiles(root, relativeRoot, pattern) {
	const absoluteRoot = resolve(root, relativeRoot);
	if (!existsSync(absoluteRoot)) return [];
	return readdirSync(absoluteRoot, { recursive: true, withFileTypes: true })
		.filter(function keepMatchingFiles(entry) {
			return entry.isFile() && pattern.test(entry.name);
		})
		.map(function mapPath(entry) {
			return toPortablePath(root, entry);
		});
}

export function verifyPortTestClassifications(root, binding = 'hook-form') {
	const configPath = `packages/${binding}/audit/test-classifications.json`;
	const manifestPath = `packages/${binding}/audit/react-parity.json`;
	const absoluteConfigPath = resolve(root, configPath);
	if (!existsSync(absoluteConfigPath))
		throw new Error(`missing port-test classifications: ${configPath}`);
	const config = JSON.parse(readFileSync(absoluteConfigPath, 'utf8'));
	const manifest = JSON.parse(readFileSync(resolve(root, manifestPath), 'utf8'));
	const classifiedPaths = new Set(
		config.tests.map(function pathOf(entry) {
			return entry.path;
		}),
	);
	const discovered = listTestFiles(
		root,
		`packages/${binding}/tests`,
		/\.test\.(?:ts|tsx|tsrx)$/,
	).filter(function keepLedgerTests(path) {
		if (!path.includes('/tests/upstream/')) return true;
		// Include adapted upstream suites when the binding classifies them in
		// the exactly-once ledger. Large trees that keep separate inventory
		// verifiers simply omit those paths from test-classifications.json.
		return classifiedPaths.has(path);
	});
	if (binding === 'motion') {
		discovered.push(...listTestFiles(root, `packages/${binding}/typetests`, /\.test-d\.ts$/));
	}
	discovered.sort();
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
			for (const divergenceId of classifiedDivergences) {
				if (!divergenceIds.has(divergenceId))
					throw new Error(`${entry.path}: divergence id is not present in the parity manifest`);
			}
		}
	}
	return { tests: discovered.length };
}
