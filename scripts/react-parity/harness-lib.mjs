import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';

const LANE_TYPES = new Set(['pristine-upstream', 'adapted-octane', 'differential', 'browser']);
const ORACLES = new Set(['required', 'optional']);
const PROVENANCE_FIELDS = [
	'repo',
	'version',
	'commit',
	'sourceRoot',
	'testRoot',
	'license',
	'integrity',
];
const ENVIRONMENT_FIELDS = [
	'node',
	'platform',
	'arch',
	'packageManager',
	'lockfile',
	'lockfileSha256',
];
const ROOT_KEYS = new Set([
	'$schema',
	'schemaVersion',
	'provenance',
	'environments',
	'lanes',
	'divergences',
]);
const PROVENANCE_KEYS = new Set([...PROVENANCE_FIELDS, 'verification']);
const ENVIRONMENT_KEYS = new Set(ENVIRONMENT_FIELDS);
const FILE_KEYS = new Set(['path', 'role', 'sha256', 'cases']);
const CASE_KEYS = new Set(['id', 'testName']);
const LANE_KEYS = new Set([
	'id',
	'type',
	'oracle',
	'available',
	'environment',
	'project',
	'files',
	'notes',
]);
const DIVERGENCE_FIELDS = [
	'upstreamResult',
	'octaneResult',
	'rationale',
	'owner',
	'reviewCondition',
];
const DIVERGENCE_KEYS = new Set(['id', 'caseIds', ...DIVERGENCE_FIELDS]);

function fail(message) {
	throw new Error(`Invalid React parity manifest: ${message}`);
}

function requiredString(value, label) {
	if (typeof value !== 'string' || value.length === 0) fail(`${label} must be a non-empty string`);
}

function exactPath(value, label) {
	requiredString(value, label);
	if (
		isAbsolute(value) ||
		value.includes('..') ||
		/[?*{}[\]]/.test(value) ||
		value.startsWith('^') ||
		value.endsWith('$')
	) {
		fail(`${label} must be an exact relative file path`);
	}
}

function deepFreeze(value) {
	if (value && typeof value === 'object' && !Object.isFrozen(value)) {
		Object.freeze(value);
		for (const child of Object.values(value)) deepFreeze(child);
	}
	return value;
}

function sourceStringLiterals(value) {
	return [
		`'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`,
		`"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`,
		`\`${value.replaceAll('\\', '\\\\').replaceAll('`', '\\`')}\``,
	];
}

export function nodeMajorSatisfies(requirement, actualMajor) {
	const match = /^(>=)?(\d+)$/.exec(requirement);
	if (!match) throw new Error(`Unsupported Node requirement: ${requirement}`);
	const requiredMajor = Number(match[2]);
	return match[1] === '>=' ? actualMajor >= requiredMajor : actualMajor === requiredMajor;
}

export function validateManifest(manifest) {
	if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest))
		fail('root must be an object');
	if (manifest.schemaVersion !== 1) fail('schemaVersion must be 1');
	for (const key of Object.keys(manifest))
		if (!ROOT_KEYS.has(key)) fail(`root has unknown key "${key}"`);

	for (const field of PROVENANCE_FIELDS)
		requiredString(manifest.provenance?.[field], `provenance.${field}`);
	if (!/^[a-f0-9]{40}$/.test(manifest.provenance.commit)) {
		fail('provenance.commit must be a full 40-character Git commit');
	}
	if (!/^sha256:[a-f0-9]{64}$/.test(manifest.provenance.integrity)) {
		fail('provenance.integrity must be a complete sha256 digest');
	}
	for (const key of Object.keys(manifest.provenance))
		if (!PROVENANCE_KEYS.has(key)) fail(`provenance has unknown key "${key}"`);
	if (manifest.provenance.verification !== 'recorded-unverified')
		fail('provenance.verification must be recorded-unverified');

	if (!manifest.environments || typeof manifest.environments !== 'object') {
		fail('environments must be an object');
	}
	if (Object.keys(manifest.environments).length === 0) fail('environments must be non-empty');
	for (const [id, environment] of Object.entries(manifest.environments)) {
		requiredString(id, 'environment id');
		for (const field of ENVIRONMENT_FIELDS) {
			requiredString(environment?.[field], `environments.${id}.${field}`);
		}
		for (const key of Object.keys(environment))
			if (!ENVIRONMENT_KEYS.has(key)) fail(`environment ${id} has unknown key "${key}"`);
		if (!/^[a-f0-9]{64}$/.test(environment.lockfileSha256))
			fail(`environments.${id}.lockfileSha256 must be sha256`);
	}

	if (!Array.isArray(manifest.lanes) || manifest.lanes.length === 0)
		fail('lanes must be non-empty');
	const laneIds = new Set();
	const caseIds = new Set();
	for (const lane of manifest.lanes) {
		let laneCaseCount = 0;
		for (const key of Object.keys(lane))
			if (!LANE_KEYS.has(key)) fail(`lane has unknown key "${key}"`);
		requiredString(lane.id, 'lane.id');
		if (laneIds.has(lane.id)) fail(`duplicate lane id "${lane.id}"`);
		laneIds.add(lane.id);
		if (!LANE_TYPES.has(lane.type)) fail(`lane ${lane.id} has unknown type "${lane.type}"`);
		if (!ORACLES.has(lane.oracle)) fail(`lane ${lane.id} oracle must be required or optional`);
		if (lane.available !== undefined && typeof lane.available !== 'boolean') {
			fail(`lane ${lane.id} available must be boolean`);
		}
		if (!manifest.environments[lane.environment])
			fail(`lane ${lane.id} references unknown environment`);
		requiredString(lane.project, `lane ${lane.id} project`);
		if (!Array.isArray(lane.files) || lane.files.length === 0)
			fail(`lane ${lane.id} files must be non-empty`);
		for (const file of lane.files) {
			for (const key of Object.keys(file))
				if (!FILE_KEYS.has(key)) fail(`lane ${lane.id} file has unknown key "${key}"`);
			exactPath(file.path, `lane ${lane.id} file path`);
			if (file.role !== 'test' && file.role !== 'support') {
				fail(`lane ${lane.id} file role must be test or support`);
			}
			if (!/^[a-f0-9]{64}$/.test(file.sha256)) fail(`lane ${lane.id} file sha256 is invalid`);
			if (file.role === 'test' && (!Array.isArray(file.cases) || file.cases.length === 0)) {
				fail(`lane ${lane.id} test file cases must be non-empty`);
			}
			if (file.role === 'support' && file.cases !== undefined) {
				fail(`lane ${lane.id} support file must not declare cases`);
			}
			for (const parityCase of file.cases ?? []) {
				for (const key of Object.keys(parityCase))
					if (!CASE_KEYS.has(key)) fail(`case has unknown key "${key}"`);
				requiredString(parityCase.id, `lane ${lane.id} case id`);
				requiredString(parityCase.testName, `case ${parityCase.id} testName`);
				if (caseIds.has(parityCase.id)) fail(`duplicate case id "${parityCase.id}"`);
				caseIds.add(parityCase.id);
				laneCaseCount++;
			}
		}
		if (laneCaseCount === 0) fail(`lane ${lane.id} must declare at least one executable case`);
	}

	if (!Array.isArray(manifest.divergences)) fail('divergences must be an array');
	const divergenceIds = new Set();
	const divergentCases = new Set();
	for (const divergence of manifest.divergences) {
		for (const key of Object.keys(divergence))
			if (!DIVERGENCE_KEYS.has(key)) fail(`divergence has unknown key "${key}"`);
		requiredString(divergence.id, 'divergence.id');
		if (divergenceIds.has(divergence.id)) fail(`duplicate divergence id "${divergence.id}"`);
		divergenceIds.add(divergence.id);
		if (!Array.isArray(divergence.caseIds) || divergence.caseIds.length !== 1) {
			fail(`divergence ${divergence.id} must match exactly one case id`);
		}
		const [caseId] = divergence.caseIds;
		if (!caseIds.has(caseId))
			fail(`divergence ${divergence.id} references unknown case id "${caseId}"`);
		if (divergentCases.has(caseId)) fail(`case id "${caseId}" has multiple divergences`);
		divergentCases.add(caseId);
		for (const field of DIVERGENCE_FIELDS) {
			requiredString(divergence[field], `divergence ${divergence.id} ${field}`);
		}
	}

	return deepFreeze(manifest);
}

export async function loadManifest(path) {
	return validateManifest(JSON.parse(await readFile(path, 'utf8')));
}

export async function verifyManifestFiles(manifest, root) {
	const absoluteRoot = resolve(root);
	for (const lane of manifest.lanes) {
		for (const file of lane.files) {
			const absolute = resolve(absoluteRoot, file.path);
			if (relative(absoluteRoot, absolute).startsWith('..'))
				fail(`file escapes repository: ${file.path}`);
			let contents;
			try {
				contents = await readFile(absolute);
			} catch (error) {
				if (error.code === 'ENOENT') throw new Error(`missing evidence file: ${file.path}`);
				throw error;
			}
			const actual = createHash('sha256').update(contents).digest('hex');
			if (actual !== file.sha256) {
				throw new Error(`integrity mismatch for evidence file: ${file.path}`);
			}
			if (file.role === 'test') {
				const source = contents.toString('utf8');
				for (const parityCase of file.cases) {
					const marker = `@parity-case ${parityCase.id}`;
					const escapedId = parityCase.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
					const matches = [
						...source.matchAll(new RegExp(`^\\s*//\\s*@parity-case\\s+${escapedId}\\s*$`, 'gm')),
					];
					if (matches.length !== 1)
						throw new Error(`${file.path}: ${marker} must appear exactly once`);
					const markerEnd = matches[0].index + matches[0][0].length;
					const tail = source.slice(markerEnd).trimStart();
					const declaration = /^(?:it|test)(?:\.(skip|todo))?\s*\(\s*/.exec(tail);
					const exactTitle = declaration
						? sourceStringLiterals(parityCase.testName).some((literal) =>
								tail.slice(declaration[0].length).startsWith(literal),
							)
						: false;
					if (!declaration || declaration[1] || !exactTitle) {
						throw new Error(
							`${file.path}: ${marker} must immediately precede one active test named ${JSON.stringify(parityCase.testName)}`,
						);
					}
				}
			}
		}
	}
	return true;
}

export async function verifyLaneEnvironment(manifest, lane, root, pnpmVersion) {
	const environment = manifest.environments[lane.environment];
	const actualMajor = Number(process.versions.node.split('.')[0]);
	if (!nodeMajorSatisfies(environment.node, actualMajor))
		throw new Error(`Node ${actualMajor} does not satisfy ${environment.node}`);
	if (environment.platform !== 'any' && environment.platform !== process.platform)
		throw new Error(`platform must be ${environment.platform}`);
	if (environment.arch !== 'any' && environment.arch !== process.arch)
		throw new Error(`architecture must be ${environment.arch}`);
	if (environment.packageManager !== `pnpm@${pnpmVersion.trim()}`)
		throw new Error(`package manager must be ${environment.packageManager}`);
	const lockfile = await readFile(resolve(root, environment.lockfile));
	const digest = createHash('sha256').update(lockfile).digest('hex');
	if (digest !== environment.lockfileSha256) throw new Error('lockfile integrity mismatch');
}

export function buildLaneArgv(lane) {
	if (lane.available === false) {
		throw new Error(`${lane.oracle} oracle is unavailable; parity not established`);
	}
	const testNames = lane.files.flatMap((file) => (file.cases ?? []).map((entry) => entry.testName));
	if (testNames.length === 0) throw new Error(`lane ${lane.id} has no executable cases`);
	const escaped = testNames.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
	return [
		'pnpm',
		'exec',
		'vitest',
		'run',
		'--project',
		lane.project,
		'-t',
		`(?:${escaped.join('|')})$`,
		...lane.files
			.filter((file) => file.role === 'test')
			.map((file) => file.path)
			.sort(),
	];
}
