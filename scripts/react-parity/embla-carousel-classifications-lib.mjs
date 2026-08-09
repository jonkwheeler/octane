import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

const CONFIG = 'packages/embla-carousel/audit/test-classifications.json';
const MANIFEST = 'packages/embla-carousel/audit/react-parity.json';
const DISPOSITIONS = new Set([
	'unmodified-upstream-suite-wrapper',
	'adapted-upstream-suite',
	'react-octane-differential',
	'octane-only-divergence',
	'octane-only-framework-contract',
]);

function discoverPortAuthoredTests(root) {
	const roots = [
		resolve(root, 'packages/embla-carousel/tests'),
		resolve(root, 'packages/embla-carousel/typetests'),
	];
	const discovered = [];
	for (const testsRoot of roots) {
		if (!existsSync(testsRoot)) continue;
		for (const entry of readdirSync(testsRoot, { recursive: true, withFileTypes: true })) {
			if (!entry.isFile()) continue;
			const name = entry.name;
			const isRuntimeTest = /\.test\.(?:ts|tsx|tsrx)$/.test(name);
			const isTypeProbe = /\.test-d\.ts$/.test(name);
			if (!isRuntimeTest && !isTypeProbe) continue;
			discovered.push(
				relative(root, resolve(entry.parentPath ?? entry.path, name))
					.split(sep)
					.join('/'),
			);
		}
	}
	return discovered.sort();
}

export function verifyEmblaCarouselTestClassifications(root) {
	const discovered = discoverPortAuthoredTests(root);
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
		throw new Error('every port-authored embla-carousel test must have exactly one classification');
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

export function discoverEmblaCarouselPortAuthoredTests(root) {
	return discoverPortAuthoredTests(root);
}
