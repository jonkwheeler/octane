import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	APPROVED_LICENSE_IDENTIFIERS,
	fingerprint,
	isRecognizableMitText,
} from './preflight-lib.mjs';

const EVIDENCE_STATUSES = new Set(['required', 'passed', 'failed', 'blocked', 'inapplicable']);
const CROSSWALK_CLASSIFICATIONS = new Set([
	'implemented',
	'conformance',
	'blocked',
	'unsupported',
	'inapplicable',
]);
const LICENSE_ARTIFACT_PATTERN = /^(?:licen[cs]e|copying)(?:[._-].*)?$/i;
const NOTICE_ARTIFACT_PATTERN = /^notice(?:[._-].*)?$/i;
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const REQUIRED_NODE_ENGINE = JSON.parse(readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'))
	.engines.node;

const COMMON_GATES = [
	['identity-license', 'Immutable identity and approved-license preflight', false],
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
		observed: 'Node reached ready through immutable identity and approved-license preflight.',
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

function attributionArtifacts(packageDirectory, pattern) {
	if (!existsSync(packageDirectory)) return [];
	return readdirSync(packageDirectory, { withFileTypes: true })
		.filter((entry) => entry.isFile() && pattern.test(entry.name))
		.map((entry) => ({
			name: entry.name,
			sha256: hashFile(path.join(packageDirectory, entry.name)),
		}))
		.sort((left, right) => left.name.localeCompare(right.name));
}

function isConfinedExportTarget(packageDirectory, target) {
	if (!target.startsWith('./')) return false;
	try {
		const packageRoot = realpathSync(packageDirectory);
		const resolvedTarget = realpathSync(path.resolve(packageDirectory, target));
		const relativeTarget = path.relative(packageRoot, resolvedTarget);
		return (
			!relativeTarget.startsWith('..') &&
			!path.isAbsolute(relativeTarget) &&
			statSync(resolvedTarget).isFile()
		);
	} catch {
		return false;
	}
}

export function inspectBindingPackage(
	packageDirectory,
	{
		expectedPackageName,
		expectedDirectory,
		identity,
		expectedLicenseHashes = [],
		expectedNoticeHashes = [],
	},
) {
	const issues = [];
	const requiredFiles = ['package.json', 'README.md', 'status.json', 'UPSTREAM.md', 'LICENSE'];
	for (const relativePath of requiredFiles) {
		if (!existsSync(path.join(packageDirectory, relativePath)))
			issues.push(`Missing ${relativePath}`);
	}
	const manifest = readJson(path.join(packageDirectory, 'package.json'), issues, 'package.json');
	const status = readJson(path.join(packageDirectory, 'status.json'), issues, 'status.json');
	const licenseArtifacts = attributionArtifacts(packageDirectory, LICENSE_ARTIFACT_PATTERN);
	const noticeArtifacts = attributionArtifacts(packageDirectory, NOTICE_ARTIFACT_PATTERN);
	if (expectedLicenseHashes.length === 0) {
		issues.push('Preflight license evidence has no content hashes');
	}
	for (const expectedHash of new Set(expectedLicenseHashes)) {
		if (!licenseArtifacts.some((artifact) => artifact.sha256 === expectedHash)) {
			issues.push(
				`No packaged LICENSE artifact retains exact upstream bytes for hash ${expectedHash}`,
			);
		}
	}
	for (const expectedHash of new Set(expectedNoticeHashes)) {
		if (!noticeArtifacts.some((artifact) => artifact.sha256 === expectedHash)) {
			issues.push(
				`No packaged NOTICE artifact retains exact upstream bytes for hash ${expectedHash}`,
			);
		}
	}
	if (manifest) {
		if (expectedPackageName && manifest.name !== expectedPackageName) {
			issues.push(`package name must be ${expectedPackageName}`);
		} else if (!manifest.name?.startsWith('@octanejs/')) {
			issues.push('package name must use @octanejs/*');
		}
		if (manifest.license !== 'MIT') issues.push('package.json license must be exact MIT');
		if (manifest.engines?.node !== REQUIRED_NODE_ENGINE) {
			issues.push(`package.json engines.node must be ${REQUIRED_NODE_ENGINE}`);
		}
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
		for (const packagedPath of [
			'src',
			'README.md',
			'UPSTREAM.md',
			...licenseArtifacts.map((artifact) => artifact.name),
			...noticeArtifacts.map((artifact) => artifact.name),
		]) {
			if (!Array.isArray(manifest.files) || !manifest.files.includes(packagedPath)) {
				issues.push(`package files must include ${packagedPath}`);
			}
		}
		const exportTargets = collectExportTargets(manifest.exports);
		if (exportTargets.length === 0) issues.push('package must declare public exports');
		for (const target of exportTargets) {
			if (!isConfinedExportTarget(packageDirectory, target)) {
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
	const artifactPaths = new Set([
		...requiredFiles,
		...licenseArtifacts.map((artifact) => artifact.name),
		...noticeArtifacts.map((artifact) => artifact.name),
	]);
	const artifacts = Object.fromEntries(
		[...artifactPaths]
			.filter((relativePath) => existsSync(path.join(packageDirectory, relativePath)))
			.sort()
			.map((relativePath) => [relativePath, hashFile(path.join(packageDirectory, relativePath))]),
	);
	return {
		status: issues.length === 0 ? 'passed' : 'blocked',
		issues,
		artifacts,
		fingerprint: fingerprint({
			identity,
			expectedPackageName,
			expectedDirectory,
			artifacts,
			issues,
		}),
	};
}

function packageRoot(specifier) {
	if (specifier.startsWith('@')) return specifier.split('/').slice(0, 2).join('/');
	return specifier.split('/')[0];
}

function normalizedStrings(values) {
	if (!Array.isArray(values)) return [];
	return [
		...new Set(values.filter((value) => typeof value === 'string').map((value) => value.trim())),
	]
		.filter(Boolean)
		.sort();
}

function isSafeLocalEvidencePath(value) {
	if (typeof value !== 'string' || !value.trim()) return false;
	const candidate = value.trim();
	const segments = candidate.split('/');
	return (
		!path.posix.isAbsolute(candidate) &&
		!path.win32.isAbsolute(candidate) &&
		!candidate.includes('\\') &&
		!candidate.includes('\0') &&
		segments.every((segment) => segment && segment !== '.' && segment !== '..')
	);
}

function normalizeReimplementationProof(proof) {
	return {
		packageName: typeof proof?.packageName === 'string' ? proof.packageName.trim() : '',
		publicBehaviors: normalizedStrings(proof?.publicBehaviors),
		localEvidence: normalizedStrings(proof?.localEvidence),
	};
}

function hasApprovedLicenseEvidence(node) {
	return (
		node?.license?.policy === 'approved-license-v2' &&
		node.license.published?.status === 'passed' &&
		node.license.source?.status === 'passed' &&
		node.license.published.spdx === node.license.source.spdx &&
		APPROVED_LICENSE_IDENTIFIERS.includes(node.license.published.spdx)
	);
}

export function auditShippedClosure({
	nodeId,
	graphNodes,
	evidenceRoot,
	runtimeDependencies,
	adaptedSources,
	reimplementedDependencies = [],
}) {
	const issues = [];
	const node = graphNodes[nodeId];
	if (!node) return { status: 'blocked', issues: [`Unknown graph node ${nodeId}`] };
	const plannedDependencies = new Set(
		(node.dependsOn ?? []).flatMap((dependencyId) => {
			const dependency = graphNodes[dependencyId];
			if (dependency?.action === 'reimplement-in-parent') return [];
			return [dependency?.packageName, dependency?.binding].filter(Boolean);
		}),
	);
	const plannedCleanRoomDependencies = new Set(
		(node.dependsOn ?? []).flatMap((dependencyId) => {
			const dependency = graphNodes[dependencyId];
			return dependency?.action === 'reimplement-in-parent' && dependency.packageName
				? [dependency.packageName]
				: [];
		}),
	);
	const normalizedRuntimeDependencies = [...new Set(runtimeDependencies.map(packageRoot))].sort();
	for (const dependency of normalizedRuntimeDependencies) {
		if (plannedCleanRoomDependencies.has(dependency)) {
			issues.push(
				`${dependency} is planned for clean-room reimplementation and must not be retained as a runtime dependency.`,
			);
			continue;
		}
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
	const normalizedAdaptedSources = adaptedSources
		.map((adaptedSource) => ({
			packageName:
				typeof adaptedSource?.packageName === 'string' ? adaptedSource.packageName.trim() : '',
			paths: Array.isArray(adaptedSource?.paths)
				? [...adaptedSource.paths].sort()
				: adaptedSource?.paths,
		}))
		.sort((left, right) =>
			left.packageName === right.packageName
				? JSON.stringify(left).localeCompare(JSON.stringify(right))
				: left.packageName.localeCompare(right.packageName),
		);
	for (const adaptedSource of normalizedAdaptedSources) {
		const adaptedNode = graphNodes[`pkg:${adaptedSource.packageName}`];
		const copyForbidden =
			adaptedNode?.action === 'reimplement-in-parent' ||
			adaptedNode?.copyPermission === 'denied-or-unproven' ||
			adaptedNode?.reimplementation?.copySource === false;
		if (copyForbidden) {
			issues.push(
				`Adapted source ${adaptedSource.packageName} must not copy or adapt source because its graph action is no-copy.`,
			);
		} else if (!hasApprovedLicenseEvidence(adaptedNode)) {
			issues.push(
				`Adapted source ${adaptedSource.packageName} has no approved-license graph evidence.`,
			);
		}
		if (!Array.isArray(adaptedSource.paths) || adaptedSource.paths.length === 0) {
			issues.push(
				`Adapted source ${adaptedSource.packageName} has no recorded copied/adapted paths.`,
			);
		}
		for (const sourcePath of Array.isArray(adaptedSource.paths) ? adaptedSource.paths : []) {
			if (!isSafeLocalEvidencePath(sourcePath)) {
				issues.push(`Adapted source path is unsafe: ${sourcePath}`);
			}
		}
	}
	if (!Array.isArray(reimplementedDependencies)) {
		issues.push('reimplementedDependencies must be an array.');
		reimplementedDependencies = [];
	}
	const proofEntries = reimplementedDependencies
		.map((original) => ({ original, proof: normalizeReimplementationProof(original) }))
		.sort((left, right) =>
			left.proof.packageName === right.proof.packageName
				? JSON.stringify(left.proof).localeCompare(JSON.stringify(right.proof))
				: left.proof.packageName.localeCompare(right.proof.packageName),
		);
	const proofs = proofEntries.map(({ proof }) => proof);
	const proofsByPackage = new Map();
	const localEvidenceArtifacts = new Map();
	let resolvedEvidenceRoot = null;
	if (plannedCleanRoomDependencies.size > 0) {
		if (typeof evidenceRoot !== 'string' || !evidenceRoot.trim()) {
			issues.push('A package-local clean-room evidence root is required.');
		} else {
			try {
				const candidateEvidenceRoot = realpathSync(evidenceRoot);
				if (statSync(candidateEvidenceRoot).isDirectory()) {
					resolvedEvidenceRoot = candidateEvidenceRoot;
				} else {
					issues.push(`Clean-room evidence root must be a directory: ${evidenceRoot}`);
				}
			} catch {
				issues.push(`Clean-room evidence root is missing: ${evidenceRoot}`);
			}
		}
	}
	for (const { original, proof } of proofEntries) {
		const label = proof.packageName || '<missing package>';
		const packageProofs = proofsByPackage.get(proof.packageName) ?? [];
		packageProofs.push(proof);
		proofsByPackage.set(proof.packageName, packageProofs);
		if (!plannedCleanRoomDependencies.has(proof.packageName)) {
			issues.push(
				`Reimplementation proof for ${label} was not planned as a direct clean-room dependency.`,
			);
		}
		if (
			!Array.isArray(original?.publicBehaviors) ||
			original.publicBehaviors.length === 0 ||
			original.publicBehaviors.some((behavior) => typeof behavior !== 'string' || !behavior.trim())
		) {
			issues.push(`Reimplementation proof for ${label} requires nonempty public behaviors.`);
		}
		if (
			!Array.isArray(original?.localEvidence) ||
			original.localEvidence.length === 0 ||
			original.localEvidence.some(
				(evidencePath) => typeof evidencePath !== 'string' || !evidencePath.trim(),
			)
		) {
			issues.push(
				`Reimplementation proof for ${label} requires nonempty independently authored local evidence.`,
			);
		}
		for (const evidencePath of Array.isArray(original?.localEvidence)
			? original.localEvidence
			: []) {
			if (!isSafeLocalEvidencePath(evidencePath)) {
				issues.push(`Clean-room local evidence path is unsafe for ${label}: ${evidencePath}`);
			} else if (resolvedEvidenceRoot) {
				const normalizedEvidencePath = evidencePath.trim();
				try {
					const resolvedEvidencePath = realpathSync(
						path.resolve(resolvedEvidenceRoot, normalizedEvidencePath),
					);
					const relativeEvidencePath = path.relative(resolvedEvidenceRoot, resolvedEvidencePath);
					if (
						relativeEvidencePath === '..' ||
						relativeEvidencePath.startsWith(`..${path.sep}`) ||
						path.isAbsolute(relativeEvidencePath)
					) {
						issues.push(
							`Clean-room local evidence path ${normalizedEvidencePath} escapes the package root for ${label}.`,
						);
					} else if (statSync(resolvedEvidencePath).isFile()) {
						localEvidenceArtifacts.set(normalizedEvidencePath, {
							path: normalizedEvidencePath,
							sha256: hashFile(resolvedEvidencePath),
						});
					} else {
						issues.push(
							`Clean-room local evidence path ${normalizedEvidencePath} must be a regular file for ${label}.`,
						);
					}
				} catch {
					issues.push(
						`Clean-room local evidence path ${normalizedEvidencePath} is missing or unreadable for ${label}.`,
					);
				}
			}
		}
	}
	for (const packageName of [...plannedCleanRoomDependencies].sort()) {
		const proofCount = proofsByPackage.get(packageName)?.length ?? 0;
		if (proofCount === 0) {
			issues.push(`${packageName} clean-room dependency has no reimplementation proof.`);
		} else if (proofCount !== 1) {
			issues.push(
				`${packageName} clean-room dependency requires exactly one reimplementation proof; found ${proofCount}.`,
			);
		}
	}
	issues.sort();
	const sortedLocalEvidenceArtifacts = [...localEvidenceArtifacts.values()].sort((left, right) =>
		left.path.localeCompare(right.path),
	);
	const report = {
		status: issues.length === 0 ? 'passed' : 'blocked',
		issues,
		reimplementedDependencies: proofs,
	};
	const fingerprintInput = {
		nodeId,
		runtimeDependencies: normalizedRuntimeDependencies,
		adaptedSources: normalizedAdaptedSources,
		reimplementedDependencies: proofs,
		issues,
	};
	if (plannedCleanRoomDependencies.size > 0) {
		report.localEvidenceArtifacts = sortedLocalEvidenceArtifacts;
		fingerprintInput.localEvidenceArtifacts = sortedLocalEvidenceArtifacts;
	}
	report.fingerprint = fingerprint(fingerprintInput);
	return report;
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
