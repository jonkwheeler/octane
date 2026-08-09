import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

const CONFIG = 'packages/vaul/audit/test-classifications.json';
const MANIFEST = 'packages/vaul/audit/react-parity.json';
const VITEST_CONFIG = 'vitest.config.js';
const DISPOSITIONS = new Set([
	'unmodified-upstream-suite-wrapper',
	'adapted-upstream-suite',
	'react-octane-differential',
	'octane-only-divergence',
	'octane-only-framework-contract',
]);
const TYPE_TEST_ROOT = 'packages/vaul/tests/types/';

function toPortablePath(root, absolutePath) {
	return relative(root, absolutePath).split(sep).join('/');
}

function discoverPortAuthoredVaulTests(root) {
	const testsRoot = resolve(root, 'packages/vaul/tests');
	return readdirSync(testsRoot, { recursive: true, withFileTypes: true })
		.filter(function keepClassifiedFiles(entry) {
			if (!entry.isFile()) return false;
			const absolute = resolve(entry.parentPath ?? entry.path, entry.name);
			const portable = toPortablePath(root, absolute);
			if (portable.includes('/tests/upstream/') || portable.includes('/.pristine-upstream-')) {
				return false;
			}
			if (/\.test\.(?:ts|tsx|tsrx)$/.test(entry.name)) return true;
			return portable.startsWith(TYPE_TEST_ROOT) && portable.endsWith('.ts');
		})
		.map(function toPortable(entry) {
			return toPortablePath(root, resolve(entry.parentPath ?? entry.path, entry.name));
		})
		.sort();
}

function readVaulParityOwnedPaths(root) {
	const source = readFileSync(resolve(root, VITEST_CONFIG), 'utf8');
	const nameIndex = source.indexOf("name: 'vaul'");
	if (nameIndex === -1) throw new Error(`missing vitest project vaul in ${VITEST_CONFIG}`);
	const before = source.slice(0, nameIndex);
	const executionIndex = before.lastIndexOf('testExecution:');
	if (executionIndex === -1) return null;
	const executionBlock = before.slice(executionIndex, nameIndex);
	if (!/testExecution:\s*\{[\s\S]*\}\s*,\s*test:\s*\{\s*$/.test(executionBlock)) {
		return null;
	}
	const includeMatch = executionBlock.match(/include:\s*\[([\s\S]*?)\]/);
	if (!includeMatch) return null;
	return [...includeMatch[1].matchAll(/'([^']+)'/g)].map(function pathOf(match) {
		return match[1];
	});
}

function pathOwnedByParity(path, ownedPaths) {
	if (ownedPaths === null) {
		return (
			path.startsWith('packages/vaul/tests/') &&
			path.endsWith('.test.ts') &&
			!path.includes('/tests/ssr/') &&
			!path.includes('/tests/browser/') &&
			!path.includes('/tests/browser-conformance/') &&
			path !== 'packages/vaul/tests/upstream-original.test.ts'
		);
	}
	return ownedPaths.includes(path);
}

export function verifyVaulTestClassifications(root) {
	const discovered = discoverPortAuthoredVaulTests(root);
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
		throw new Error('every port-authored vaul test must have exactly one classification');
	}
	const ownedPaths = readVaulParityOwnedPaths(root);
	for (const entry of config.tests) {
		if (!DISPOSITIONS.has(entry.disposition))
			throw new Error(`${entry.path}: unknown test disposition`);
		if (entry.disposition.startsWith('octane-only-')) {
			if (!entry.reason)
				throw new Error(`${entry.path}: Octane-only tests require an explicit reason`);
			if (entry.oracle)
				throw new Error(`${entry.path}: Octane-only tests must not claim React parity`);
			if (pathOwnedByParity(entry.path, ownedPaths)) {
				throw new Error(
					`${entry.path}: Octane-only framework/package contracts must not be owned by a react-parity lane`,
				);
			}
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
