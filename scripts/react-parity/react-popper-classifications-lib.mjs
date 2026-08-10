import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

const CONFIG = 'packages/react-popper/audit/test-classifications.json';
const MANIFEST = 'packages/react-popper/audit/react-parity.json';
const DISPOSITIONS = new Set([
	'unmodified-upstream-suite-wrapper',
	'adapted-upstream-suite',
	'react-octane-differential',
	'octane-only-divergence',
	'octane-only-framework-contract',
]);

function posix(value) {
	return value.split(sep).join('/');
}

function discoverTests(root) {
	const packagesRoot = resolve(root, 'packages/react-popper');
	const discovered = [];
	for (const relativeRoot of ['tests', 'typetests']) {
		const absoluteRoot = resolve(packagesRoot, relativeRoot);
		if (!existsSync(absoluteRoot)) continue;
		for (const entry of readdirSync(absoluteRoot, { recursive: true, withFileTypes: true })) {
			if (!entry.isFile() || !/\.test\.(?:ts|tsx|tsrx)$/.test(entry.name)) continue;
			discovered.push(posix(relative(root, resolve(entry.parentPath ?? entry.path, entry.name))));
		}
	}
	return discovered.sort();
}

export function verifyReactPopperTestClassifications(root) {
	const discovered = discoverTests(root);
	const configPath = resolve(root, CONFIG);
	if (!existsSync(configPath)) throw new Error(`missing port-test classifications: ${CONFIG}`);
	const config = JSON.parse(readFileSync(configPath, 'utf8'));
	const manifest = JSON.parse(readFileSync(resolve(root, MANIFEST), 'utf8'));
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
		throw new Error('every port-authored react-popper test must have exactly one classification');
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
