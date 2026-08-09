import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

const UPSTREAM_TEST_ROOT = 'packages/react-resizable-panels/upstream/source/lib';
const PORTED_TEST_ROOT = 'packages/react-resizable-panels/tests/upstream';
const PORTED_INVENTORY_PATH = 'packages/react-resizable-panels/audit/upstream-adapted.SHA256SUMS';
const TEST_INVENTORY_PATH = 'packages/react-resizable-panels/audit/test-inventory.json';

const ADAPTED_PATH_OVERRIDES = new Map([
	[
		'global/utils/getImperativeGroupMethods.test.ts',
		'components/group/getImperativeGroupMethods.test.ts',
	],
	[
		'global/utils/getImperativePanelMethods.test.ts',
		'components/panel/getImperativePanelMethods.test.ts',
	],
]);

function filesBelow(root) {
	return readdirSync(root, { recursive: true, withFileTypes: true })
		.filter(function keepFiles(entry) {
			return entry.isFile();
		})
		.map(function toAbsolute(entry) {
			return resolve(entry.parentPath ?? entry.path, entry.name);
		})
		.sort();
}

function portableRelative(root, file) {
	return relative(root, file).split(sep).join('/');
}

function adaptedRelativePath(upstreamRelative) {
	const override = ADAPTED_PATH_OVERRIDES.get(upstreamRelative);
	if (override) return override;
	return upstreamRelative.replace(/\.tsx$/, '.tsrx');
}

function registrationIdentities(source) {
	return [...source.matchAll(/\b(?:it|test)\s*\(\s*(["'])(.*?)\1/gs)].map(function titleOf(match) {
		return match[2];
	});
}

export function renderReactResizablePanelsAdaptedInventory(repoRoot) {
	const portedRoot = resolve(repoRoot, PORTED_TEST_ROOT);
	return `${filesBelow(portedRoot)
		.map(function lineFor(file) {
			const digest = createHash('sha256').update(readFileSync(file)).digest('hex');
			return `${digest}  ${portableRelative(portedRoot, file)}`;
		})
		.join('\n')}\n`;
}

export function verifyReactResizablePanelsUpstream(repoRoot) {
	const inventory = JSON.parse(readFileSync(resolve(repoRoot, TEST_INVENTORY_PATH), 'utf8'));
	const upstreamRoot = resolve(repoRoot, UPSTREAM_TEST_ROOT);
	const portedRoot = resolve(repoRoot, PORTED_TEST_ROOT);
	let upstreamCases = 0;
	let portedCases = 0;

	for (const artifact of inventory.artifacts) {
		if (artifact.disposition !== 'adapted') {
			throw new Error(`${artifact.path}: upstream artifact must be adapted`);
		}
		const adaptedRelative = adaptedRelativePath(artifact.path);
		const expectedAdaptedPath = `tests/upstream/${adaptedRelative}`;
		if (artifact.adaptedPath !== expectedAdaptedPath) {
			throw new Error(
				`${artifact.path}: adaptedPath must be ${expectedAdaptedPath}, got ${artifact.adaptedPath}`,
			);
		}
		const upstreamSource = readFileSync(resolve(upstreamRoot, artifact.path), 'utf8');
		const portedSource = readFileSync(resolve(portedRoot, adaptedRelative), 'utf8');
		if (/\b(?:it|test|describe)\.(?:skip|todo|only|failing)\b/.test(portedSource)) {
			throw new Error(
				`${adaptedRelative}: adapted upstream tests must execute without focused, failing, skip, or todo markers`,
			);
		}
		const upstreamTitles = registrationIdentities(upstreamSource);
		const portedTitles = registrationIdentities(portedSource);
		if (JSON.stringify([...portedTitles].sort()) !== JSON.stringify([...upstreamTitles].sort())) {
			throw new Error(
				`${adaptedRelative}: adapted test registrations drifted from the pinned upstream suite`,
			);
		}
		if (JSON.stringify([...artifact.identities]) !== JSON.stringify(upstreamTitles)) {
			throw new Error(`${artifact.path}: inventory identities drifted from upstream source`);
		}
		upstreamCases += upstreamTitles.length;
		portedCases += portedTitles.length;
	}

	const expectedPortedInventory = readFileSync(resolve(repoRoot, PORTED_INVENTORY_PATH), 'utf8');
	const actualPortedInventory = renderReactResizablePanelsAdaptedInventory(repoRoot);
	if (actualPortedInventory !== expectedPortedInventory) {
		throw new Error(
			'react-resizable-panels adapted test inventory drifted; review and record the change',
		);
	}

	return {
		artifacts: inventory.artifacts.length,
		portedCases,
		upstreamCases,
	};
}
