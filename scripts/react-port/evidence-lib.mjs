import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fingerprint, isRecognizableMitText } from './preflight-lib.mjs';

const EVIDENCE_STATUSES = new Set(['required', 'passed', 'failed', 'blocked', 'inapplicable']);
const CROSSWALK_CLASSIFICATIONS = new Set([
	'implemented',
	'conformance',
	'blocked',
	'unsupported',
	'inapplicable',
]);

const COMMON_GATES = [
	['identity-license', 'Immutable identity and exact-MIT preflight', false],
	['upstream-crosswalk', 'Complete upstream test-registration crosswalk', false],
	['package-tests', 'Focused package behavior tests', false],
	['typecheck', 'Public and authored-source typecheck', false],
	['public-exports', 'Public entrypoint and export checks', false],
	['package-pack', 'Packed external-consumer check', false],
	['package-contract', 'Binding package contract', false],
	['provenance', 'UPSTREAM, license, and notice provenance', false],
	['closure-audit', 'Final shipped dependency and adapted-source closure', false],
	['generated-data', 'Affected catalog and generated-data checks', true],
	['format', 'Formatting checks', false],
];

const CATEGORY_GATES = Object.freeze({
	'thin-core': [
		['differential-surface', 'Framework-neutral core and thin binding equivalence', false],
	],
	'hooks-store': [
		['identity-lifecycle', 'Subscription, identity, bailout, effect, and cleanup behavior', false],
		['server-snapshot', 'Server snapshot and hydration-safe store behavior', true],
	],
	'dom-component': [
		['differential-events', 'Differential DOM and event-sequence behavior', false],
		['focus-ref-keyed', 'Focus, ref lifecycle, and keyed survivor identity', false],
		['browser', 'Real-browser component behavior', false],
	],
	'provider-portal': [
		['provider-identity', 'Provider/context identity and nested ownership', false],
		['portal-lifecycle', 'Portal ancestry, suspension/error ownership, and teardown', false],
	],
	'ssr-sensitive': [['ssr-hydration', 'SSR, streaming when public, and hydration behavior', false]],
	'async-suspense': [
		['async-lifecycle', 'Promise, replay, rejection, timer, and cleanup behavior', false],
	],
	'performance-sensitive': [
		['performance', 'Relevant runtime, SSR, hydration, compiler, and size guards', false],
	],
});

function gateRecord([id, label, allowInapplicable]) {
	return [id, { id, label, status: 'required', allowInapplicable }];
}

export function createEvidenceMatrix({ categories, preflightArtifact }) {
	if (!Array.isArray(categories) || categories.length === 0) {
		throw new Error('At least one binding evidence category is required');
	}
	if (typeof preflightArtifact !== 'string' || !preflightArtifact) {
		throw new Error('The preflight manifest/report artifact is required');
	}
	const normalizedCategories = [...new Set(categories)].sort();
	for (const category of normalizedCategories) {
		if (!CATEGORY_GATES[category]) throw new Error(`Unknown evidence category: ${category}`);
	}
	const definitions = [
		...COMMON_GATES,
		...normalizedCategories.flatMap((category) => CATEGORY_GATES[category]),
	];
	const gates = Object.fromEntries(definitions.map(gateRecord));
	gates['identity-license'] = {
		...gates['identity-license'],
		status: 'passed',
		artifact: preflightArtifact,
		observed: 'Node reached ready through immutable identity and exact-MIT preflight.',
	};
	return { schemaVersion: 1, categories: normalizedCategories, gates };
}

export function recordEvidence(matrix, gateId, evidence) {
	const gate = matrix.gates?.[gateId];
	if (!gate) throw new Error(`Unknown evidence gate: ${gateId}`);
	if (!EVIDENCE_STATUSES.has(evidence.status) || evidence.status === 'required') {
		throw new Error(`Evidence gate ${gateId} needs a terminal status`);
	}
	if (evidence.status === 'passed' || evidence.status === 'failed') {
		if (!evidence.command && !evidence.artifact) {
			throw new Error(`Evidence gate ${gateId} requires a command or artifact`);
		}
		if (!evidence.observed) throw new Error(`Evidence gate ${gateId} requires an observed result`);
	}
	if (evidence.status === 'blocked' && (!evidence.reason || !evidence.repair)) {
		throw new Error(`Blocked evidence gate ${gateId} requires a reason and repair action`);
	}
	if (evidence.status === 'inapplicable') {
		if (!gate.allowInapplicable) throw new Error(`Evidence gate ${gateId} cannot be inapplicable`);
		if (!evidence.reason) throw new Error(`Inapplicable evidence gate ${gateId} requires a reason`);
	}
	matrix.gates[gateId] = { ...gate, ...structuredClone(evidence), id: gateId };
	return matrix.gates[gateId];
}

export function validateUpstreamCrosswalk(registrations, crosswalk) {
	if (!Array.isArray(registrations) || !Array.isArray(crosswalk)) {
		throw new Error('Upstream registrations and crosswalk must be arrays');
	}
	const expected = new Map();
	for (const registration of registrations) {
		if (!registration.id || expected.has(registration.id)) {
			throw new Error(`Duplicate or missing upstream registration id: ${registration.id}`);
		}
		expected.set(registration.id, registration);
	}
	const actual = new Map();
	for (const entry of crosswalk) {
		if (!entry.id || actual.has(entry.id)) throw new Error(`Duplicate crosswalk id: ${entry.id}`);
		if (!expected.has(entry.id)) throw new Error(`Crosswalk contains unknown case ${entry.id}`);
		if (!CROSSWALK_CLASSIFICATIONS.has(entry.classification)) {
			throw new Error(`Crosswalk case ${entry.id} has invalid classification`);
		}
		if (
			(entry.classification === 'implemented' || entry.classification === 'conformance') &&
			!entry.localEvidence
		) {
			throw new Error(`Crosswalk case ${entry.id} requires local evidence`);
		}
		if (
			['blocked', 'unsupported', 'inapplicable'].includes(entry.classification) &&
			!entry.rationale
		) {
			throw new Error(`Crosswalk case ${entry.id} requires a rationale`);
		}
		actual.set(entry.id, entry);
	}
	const missing = [...expected.keys()].filter((id) => !actual.has(id));
	if (missing.length > 0)
		throw new Error(`Crosswalk is missing upstream case(s): ${missing.join(', ')}`);
	const cases = [...expected.keys()]
		.sort()
		.map((id) => ({ ...expected.get(id), ...actual.get(id) }));
	return {
		status: cases.some((entry) => entry.classification === 'blocked') ? 'blocked' : 'passed',
		cases,
		fingerprint: fingerprint(cases),
	};
}

function readJson(filePath, issues, label) {
	try {
		return JSON.parse(readFileSync(filePath, 'utf8'));
	} catch (error) {
		issues.push(
			`${label} is missing or invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
		);
		return null;
	}
}

function collectExportTargets(value, targets = []) {
	if (typeof value === 'string') targets.push(value);
	else if (value && typeof value === 'object') {
		for (const child of Object.values(value)) collectExportTargets(child, targets);
	}
	return targets;
}

function hashFile(filePath) {
	return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function sourceFiles(directory) {
	if (!existsSync(directory)) return [];
	return readdirSync(directory, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile())
		.map((entry) => path.join(entry.parentPath, entry.name));
}

export function inspectBindingPackage(
	packageDirectory,
	{ expectedDirectory, identity, expectedNoticePaths = [] },
) {
	const issues = [];
	const requiredFiles = ['package.json', 'README.md', 'status.json', 'UPSTREAM.md', 'LICENSE'];
	for (const relativePath of [...requiredFiles, ...expectedNoticePaths]) {
		if (!existsSync(path.join(packageDirectory, relativePath)))
			issues.push(`Missing ${relativePath}`);
	}
	const manifest = readJson(path.join(packageDirectory, 'package.json'), issues, 'package.json');
	const status = readJson(path.join(packageDirectory, 'status.json'), issues, 'status.json');
	if (manifest) {
		if (!manifest.name?.startsWith('@octanejs/')) issues.push('package name must use @octanejs/*');
		if (manifest.license !== 'MIT') issues.push('package.json license must be exact MIT');
		if (manifest.engines?.node !== '>=22') issues.push('package.json engines.node must be >=22');
		if (manifest.publishConfig?.access !== 'public') issues.push('package must publish publicly');
		if (manifest.repository?.directory !== expectedDirectory) {
			issues.push(`repository.directory must be ${expectedDirectory}`);
		}
		if (manifest.dependencies?.octane !== undefined)
			issues.push('octane must not be a regular dependency');
		if (manifest.peerDependencies?.octane !== 'workspace:*')
			issues.push('octane peer must be workspace:*');
		if (manifest.devDependencies?.octane !== 'workspace:*')
			issues.push('octane dev dependency must be workspace:*');
		if (typeof manifest.scripts?.test !== 'string')
			issues.push('package must define a test script');
		for (const packagedPath of ['src', 'README.md', 'UPSTREAM.md', 'LICENSE']) {
			if (!Array.isArray(manifest.files) || !manifest.files.includes(packagedPath)) {
				issues.push(`package files must include ${packagedPath}`);
			}
		}
		const exportTargets = collectExportTargets(manifest.exports);
		if (exportTargets.length === 0) issues.push('package must declare public exports');
		for (const target of exportTargets) {
			const resolvedTarget = path.resolve(packageDirectory, target);
			const relativeTarget = path.relative(packageDirectory, resolvedTarget);
			if (
				!target.startsWith('./') ||
				relativeTarget.startsWith('..') ||
				path.isAbsolute(relativeTarget) ||
				!existsSync(resolvedTarget)
			) {
				issues.push(`package export target is missing or escapes the package: ${target}`);
			}
		}
	}
	if (status) {
		if (
			status.upstream?.package !== identity.packageName ||
			status.upstream?.version !== identity.version
		) {
			issues.push('status.json upstream identity does not match preflight');
		}
		if (!/^\d{4}-\d{2}-\d{2}$/.test(status.verified ?? '')) {
			issues.push('status.json verified must be a YYYY-MM-DD completion date');
		}
		if (!status.surface) issues.push('status.json must describe the verified surface');
	}
	const upstreamPath = path.join(packageDirectory, 'UPSTREAM.md');
	if (existsSync(upstreamPath)) {
		const upstream = readFileSync(upstreamPath, 'utf8');
		for (const value of [identity.packageName, identity.version, identity.commit]) {
			if (!upstream.includes(value)) issues.push(`UPSTREAM.md does not identify ${value}`);
		}
		if (!/^## Source boundary$/m.test(upstream))
			issues.push('UPSTREAM.md has no Source boundary section');
	}
	const licensePath = path.join(packageDirectory, 'LICENSE');
	if (existsSync(licensePath) && !isRecognizableMitText(readFileSync(licensePath, 'utf8'))) {
		issues.push('LICENSE is not recognizable MIT text');
	}
	const authoredSource = sourceFiles(path.join(packageDirectory, 'src'));
	if (authoredSource.length === 0) issues.push('package has no source files');
	if (
		!sourceFiles(path.join(packageDirectory, 'tests')).some((file) =>
			/\.test\.[cm]?[jt]sx?$/.test(file),
		)
	) {
		issues.push('package has no observable test file');
	}
	for (const file of authoredSource.filter((file) => /\.(?:ts|tsx|tsrx)$/.test(file))) {
		if (/declare\s+module\s+['"]\*\.tsrx['"]/.test(readFileSync(file, 'utf8'))) {
			issues.push(
				`${path.relative(packageDirectory, file)} contains a forbidden ambient .tsrx declaration`,
			);
		}
	}
	const artifacts = Object.fromEntries(
		requiredFiles
			.filter((relativePath) => existsSync(path.join(packageDirectory, relativePath)))
			.map((relativePath) => [relativePath, hashFile(path.join(packageDirectory, relativePath))]),
	);
	return {
		status: issues.length === 0 ? 'passed' : 'blocked',
		issues,
		artifacts,
		fingerprint: fingerprint({ identity, expectedDirectory, artifacts, issues }),
	};
}

function packageRoot(specifier) {
	if (specifier.startsWith('@')) return specifier.split('/').slice(0, 2).join('/');
	return specifier.split('/')[0];
}

function hasExactMitEvidence(node) {
	return (
		node?.license?.policy === 'exact-mit-v1' &&
		node.license.published?.status === 'passed' &&
		node.license.source?.status === 'passed'
	);
}

export function auditShippedClosure({ nodeId, graphNodes, runtimeDependencies, adaptedSources }) {
	const issues = [];
	const node = graphNodes[nodeId];
	if (!node) return { status: 'blocked', issues: [`Unknown graph node ${nodeId}`] };
	const plannedDependencies = new Set(
		node.dependsOn.flatMap((dependencyId) => {
			const dependency = graphNodes[dependencyId];
			return [dependency?.packageName, dependency?.binding].filter(Boolean);
		}),
	);
	for (const dependency of [...new Set(runtimeDependencies.map(packageRoot))].sort()) {
		if (
			dependency === 'octane' ||
			dependency === 'react' ||
			dependency === 'react-dom' ||
			plannedDependencies.has(dependency)
		) {
			continue;
		}
		issues.push(`Runtime dependency ${dependency} was not present in the approved graph.`);
	}
	for (const adaptedSource of adaptedSources) {
		const adaptedNode = graphNodes[`pkg:${adaptedSource.packageName}`];
		if (!hasExactMitEvidence(adaptedNode)) {
			issues.push(`Adapted source ${adaptedSource.packageName} has no exact-MIT graph evidence.`);
		}
		if (!Array.isArray(adaptedSource.paths) || adaptedSource.paths.length === 0) {
			issues.push(
				`Adapted source ${adaptedSource.packageName} has no recorded copied/adapted paths.`,
			);
		}
		for (const sourcePath of adaptedSource.paths ?? []) {
			if (
				path.posix.isAbsolute(sourcePath) ||
				sourcePath.includes('\\') ||
				sourcePath.split('/').includes('..')
			) {
				issues.push(`Adapted source path is unsafe: ${sourcePath}`);
			}
		}
	}
	return {
		status: issues.length === 0 ? 'passed' : 'blocked',
		issues,
		fingerprint: fingerprint({ nodeId, runtimeDependencies, adaptedSources, issues }),
	};
}

export function evaluateVerificationReadiness({
	matrix,
	crosswalkReport,
	packageReport,
	closureReport,
}) {
	const issues = [];
	for (const gate of Object.values(matrix.gates ?? {})) {
		if (gate.status === 'passed') continue;
		if (gate.status === 'inapplicable' && gate.allowInapplicable && gate.reason) continue;
		issues.push(`Evidence gate ${gate.id} is ${gate.status}.`);
	}
	for (const [label, report] of [
		['Upstream crosswalk', crosswalkReport],
		['Package contract', packageReport],
		['Shipped closure', closureReport],
	]) {
		if (report?.status !== 'passed') issues.push(`${label} is not passed.`);
	}
	return {
		status: issues.length === 0 ? 'verified' : 'blocked',
		issues,
		fingerprint: fingerprint({ matrix, crosswalkReport, packageReport, closureReport }),
	};
}
