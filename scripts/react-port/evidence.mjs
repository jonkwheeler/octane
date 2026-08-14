#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import {
	auditShippedClosure,
	assertCurrentEvidenceMatrix,
	createEvidenceMatrix,
	evaluateVerificationReadiness,
	inspectBindingPackage,
	isCurrentEvidenceMatrix,
	recordEvidence,
	validateUpstreamCrosswalk,
} from './evidence-lib.mjs';
import { sanitizeForReport } from './preflight-lib.mjs';
import {
	acquireBatchLock,
	assertPlannedPathIsSafe,
	detectNodeWorktreeCollisions,
	releaseBatchLock,
	transitionNodeState,
	validateBatchManifest,
	writeManifestAtomically,
} from './state-lib.mjs';
import { credentialValuesFromEnvironment } from './report-lib.mjs';

const execFileAsync = promisify(execFile);
const DEFAULT_COMMAND_TIMEOUT_MS = 10 * 60 * 1_000;
const MAX_COMMAND_TIMEOUT_MS = 30 * 60 * 1_000;
const MAX_COMMAND_OUTPUT_BYTES = 1024 * 1024;
const PACKAGE_TEST_GATES = new Set(['package-tests', 'public-exports']);
const PARITY_GATES = new Set([
	'differential-surface',
	'identity-lifecycle',
	'server-snapshot',
	'differential-events',
	'focus-ref-keyed',
	'browser',
	'provider-identity',
	'portal-lifecycle',
	'ssr-hydration',
	'async-lifecycle',
	'performance',
]);
const PACK_GATES = new Set([
	'packed-source-types-node',
	'packed-source-types-browser',
	'package-pack',
]);

function usage() {
	return `Usage:
  node scripts/react-port/evidence.mjs init --batch <id> --node <pkg:id> --category <kind> [...]
  node scripts/react-port/evidence.mjs record --batch <id> --node <pkg:id> --gate <id> --status <status> [evidence]
  node scripts/react-port/evidence.mjs run --batch <id> --node <pkg:id> --gate <id> [--gate <id> ...] -- <approved-gate-command>
  node scripts/react-port/evidence.mjs verify --batch <id> --node <pkg:id> --package-dir <path> \
    --expected-directory <repo-path> --registrations <json> --crosswalk <json> --closure <json>

Common options:
  --work-root <directory>  Batch root (default: .react-port-work)
  --recover-stale-lock     Explicitly recover a lock older than 30 minutes

Use run for command-backed passed/failed evidence; commands execute directly
without a shell after validation against the requested gate. Record accepts
blocked rows with --reason and --repair, or inapplicable rows with --reason.
Automated gates are computed by verify.
`;
}

function parseArguments(arguments_) {
	if (arguments_[0] === '--') arguments_ = arguments_.slice(1);
	const separatorIndex = arguments_.indexOf('--');
	const optionArguments = separatorIndex === -1 ? arguments_ : arguments_.slice(0, separatorIndex);
	const commandArguments = separatorIndex === -1 ? [] : arguments_.slice(separatorIndex + 1);
	const command = optionArguments[0];
	if (!['init', 'record', 'run', 'verify'].includes(command))
		throw new Error('Expected init, record, run, or verify');
	const options = {
		category: [],
		gate: [],
		workRoot: path.join(process.cwd(), '.react-port-work'),
	};
	for (let index = 1; index < optionArguments.length; index += 1) {
		const argument = optionArguments[index];
		if (argument === '--recover-stale-lock') {
			options.recoverStaleLock = true;
			continue;
		}
		if (!argument.startsWith('--')) throw new Error(`Unexpected argument: ${argument}`);
		const name = argument.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
		const value = optionArguments[index + 1];
		if (!value) throw new Error(`${argument} requires a value`);
		if (name === 'category' || name === 'gate') options[name].push(value);
		else if (name === 'workRoot') options.workRoot = path.resolve(value);
		else options[name] = value;
		index += 1;
	}
	if (!options.batch || !/^[a-z0-9][a-z0-9._-]*$/i.test(options.batch)) {
		throw new Error('--batch requires a path-safe identifier');
	}
	if (!options.node || !/^pkg:[@a-z0-9][@a-z0-9._/-]*$/i.test(options.node)) {
		throw new Error('--node requires a pkg:<package-name> graph id');
	}
	if (command !== 'run' && commandArguments.length > 0) {
		throw new Error('Only run accepts command arguments after --');
	}
	return { command, options, commandArguments };
}

function readJson(filePath, label) {
	try {
		return JSON.parse(readFileSync(path.resolve(filePath), 'utf8'));
	} catch (error) {
		throw new Error(
			`${label} is missing or invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

function canonicalPath(filePath) {
	let existingPath = path.resolve(filePath);
	const missingParts = [];
	while (!existsSync(existingPath)) {
		const parent = path.dirname(existingPath);
		if (parent === existingPath) break;
		missingParts.unshift(path.basename(existingPath));
		existingPath = parent;
	}
	return path.join(realpathSync(existingPath), ...missingParts);
}

function attributionHashes(node) {
	const verdicts = [node.license?.published, node.license?.source];
	return {
		licenses: [
			...new Set(verdicts.flatMap((verdict) => verdict?.evidence ?? []).map((item) => item.sha256)),
		]
			.filter(Boolean)
			.sort(),
		notices: [
			...new Set(verdicts.flatMap((verdict) => verdict?.notices ?? []).map((item) => item.sha256)),
		]
			.filter(Boolean)
			.sort(),
	};
}

function setAutomatedGate(matrix, gateId, report, { artifact, passedObserved, repair }) {
	if (report.status === 'passed') {
		recordEvidence(matrix, gateId, {
			status: 'passed',
			artifact,
			observed: passedObserved,
		});
	} else {
		recordEvidence(matrix, gateId, {
			status: 'blocked',
			reason: report.issues?.join('\n') || `${gateId} did not pass`,
			repair,
		});
	}
}

function commandTimeout(options) {
	if (options.timeoutMs === undefined) return DEFAULT_COMMAND_TIMEOUT_MS;
	const timeout = Number(options.timeoutMs);
	if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > MAX_COMMAND_TIMEOUT_MS) {
		throw new Error(`--timeout-ms must be an integer from 1 to ${MAX_COMMAND_TIMEOUT_MS}`);
	}
	return timeout;
}

function commandObservation(stdout, stderr, fallback, credentialValues) {
	const output = [stdout, stderr].filter(Boolean).join('\n').trim();
	return sanitizeForReport(output || fallback, '', credentialValues);
}

function isExactCommand(commandArguments, expected) {
	return JSON.stringify(commandArguments) === JSON.stringify(expected);
}

function isTypeProjectCommand(commandArguments, bindingDirectory, gateId) {
	if (
		commandArguments.length !== 6 ||
		!isExactCommand(commandArguments.slice(0, 5), ['pnpm', 'exec', 'tsrx-tsc', '--noEmit', '-p'])
	) {
		return false;
	}
	const projectPath = commandArguments[5].replaceAll('\\', '/').replace(/^\.\//, '');
	if (!projectPath.startsWith(`${bindingDirectory}/`) || !projectPath.endsWith('/tsconfig.json')) {
		return false;
	}
	const relativeProject = projectPath.slice(`${bindingDirectory}/`.length);
	if (gateId === 'authored-source-types') return relativeProject === 'tsconfig.json';
	if (relativeProject === 'tests/types/tsconfig.json') return true;
	if (gateId === 'upstream-types')
		return /(?:^|\/)(?:upstream|pristine|adapted)(?:\/|$)/i.test(relativeProject);
	return /(?:^|\/)public(?:\/|$)/i.test(relativeProject);
}

export function assertApprovedGateCommand(gateIds, commandArguments, node) {
	const bindingDirectory = node.bindingDirectory?.replaceAll('\\', '/');
	if (!bindingDirectory) throw new Error('Evidence node has no graph-planned binding directory');
	for (const gateId of gateIds) {
		let approved = false;
		if (PACKAGE_TEST_GATES.has(gateId)) {
			approved = isExactCommand(commandArguments, ['pnpm', '--dir', bindingDirectory, 'test']);
		} else if (PARITY_GATES.has(gateId)) {
			approved = isExactCommand(commandArguments, [
				'node',
				'scripts/react-parity/harness.mjs',
				'run-required',
				'--manifest',
				`${bindingDirectory}/audit/react-parity.json`,
			]);
		} else if (['upstream-types', 'authored-source-types', 'public-types'].includes(gateId)) {
			approved = isTypeProjectCommand(commandArguments, bindingDirectory, gateId);
		} else if (PACK_GATES.has(gateId)) {
			approved = isExactCommand(commandArguments, ['pnpm', 'packages:pack:check']);
		} else if (gateId === 'generated-data') {
			approved = isExactCommand(commandArguments, ['pnpm', 'sync']);
		} else if (gateId === 'format') {
			approved = isExactCommand(commandArguments, ['pnpm', 'format:check']);
		}
		if (!approved) {
			throw new Error(
				`Command is not an approved command for ${gateId}; use the gate-owned command documented by the React library port skill`,
			);
		}
	}
}

async function operate(
	command,
	options,
	manifest,
	batchDirectory,
	commandArguments,
	assertCommand,
) {
	const node = manifest.nodes[options.node];
	if (!node) throw new Error(`Batch has no node ${options.node}`);
	const credentialValues = credentialValuesFromEnvironment();

	if (command === 'init') {
		if (node.state !== 'ready' && node.state !== 'implementing') {
			throw new Error(`Evidence can start only from ready/implementing, received ${node.state}`);
		}
		if (options.category.length === 0) throw new Error('init requires at least one --category');
		if (node.state === 'ready') {
			if (!node.bindingDirectory)
				throw new Error(`Node ${options.node} has no planned binding path`);
			const workspaceRoot = manifest.workspaceRoot ?? path.dirname(path.resolve(options.workRoot));
			assertPlannedPathIsSafe(workspaceRoot, node.bindingDirectory);
			const collisions = detectNodeWorktreeCollisions({
				repoRoot: workspaceRoot,
				bindingDirectory: node.bindingDirectory,
				baseline: manifest.baseline,
			});
			if (collisions.length > 0) {
				throw new Error(`Worktree collision in planned binding path(s): ${collisions.join(', ')}`);
			}
			node.evidenceMatrix = createEvidenceMatrix({
				categories: options.category,
				preflightArtifact: path.join(
					path.resolve(options.workRoot),
					manifest.batchId,
					'manifest.json',
				),
			});
			transitionNodeState(manifest, options.node, 'implementing', {
				evidenceFingerprint: node.evidenceFingerprint,
			});
		} else {
			const requestedCategories = [...new Set(options.category)].sort();
			if (JSON.stringify(node.evidenceMatrix?.categories) !== JSON.stringify(requestedCategories)) {
				throw new Error('Implementing node already has a different evidence category matrix');
			}
			if (!isCurrentEvidenceMatrix(node.evidenceMatrix)) {
				node.evidenceMatrix = createEvidenceMatrix({
					categories: requestedCategories,
					preflightArtifact: path.join(
						path.resolve(options.workRoot),
						manifest.batchId,
						'manifest.json',
					),
				});
				delete node.evidence;
			}
		}
		return { schemaVersion: 1, command, status: 'passed', nodeId: options.node, state: node.state };
	}

	if (node.state !== 'implementing' || !node.evidenceMatrix) {
		throw new Error(
			`Node ${options.node} must be implementing with an initialized evidence matrix`,
		);
	}
	assertCurrentEvidenceMatrix(node.evidenceMatrix);
	if (command === 'record') {
		if (options.gate.length !== 1 || !options.status) {
			throw new Error('record requires exactly one --gate and --status');
		}
		const gateId = options.gate[0];
		const gate = node.evidenceMatrix.gates[gateId];
		if (!gate) throw new Error(`Unknown evidence gate: ${gateId}`);
		if (options.command) {
			throw new Error('record cannot claim command evidence; use the gate-owned run command');
		}
		if (['passed', 'failed'].includes(options.status)) {
			if (gate.evidenceType === 'command') {
				throw new Error(`Evidence gate ${gateId} is command-backed; use run`);
			}
			if (gate.evidenceType === 'automated') {
				throw new Error(`Evidence gate ${gateId} is computed by verify`);
			}
			if (!options.artifact) {
				throw new Error('record passed/failed evidence requires an existing --artifact');
			}
			options.artifact = path.resolve(options.artifact);
			if (!existsSync(options.artifact)) {
				throw new Error(`record artifact does not exist: ${options.artifact}`);
			}
		}
		const evidence = sanitizeForReport(
			{
				status: options.status,
				command: options.command,
				artifact: options.artifact,
				observed: options.observed,
				reason: options.reason,
				repair: options.repair,
			},
			'',
			credentialValues,
		);
		recordEvidence(node.evidenceMatrix, gateId, evidence);
		return {
			schemaVersion: 1,
			command,
			status: 'passed',
			nodeId: options.node,
			gate: node.evidenceMatrix.gates[gateId],
		};
	}
	if (command === 'run') {
		const gateIds = [...new Set(options.gate)];
		if (gateIds.length === 0) throw new Error('run requires at least one --gate');
		for (const gateId of gateIds) {
			if (!node.evidenceMatrix.gates[gateId]) {
				throw new Error(`Unknown evidence gate: ${gateId}`);
			}
		}
		if (commandArguments.length === 0) {
			throw new Error('run requires an executable and arguments after --');
		}
		assertCommand(gateIds, commandArguments, node);
		const commandDisplay = sanitizeForReport(
			JSON.stringify(commandArguments),
			'',
			credentialValues,
		);
		let evidence;
		try {
			const { stdout, stderr } = await execFileAsync(
				commandArguments[0],
				commandArguments.slice(1),
				{
					cwd: manifest.workspaceRoot ?? process.cwd(),
					encoding: 'utf8',
					maxBuffer: MAX_COMMAND_OUTPUT_BYTES,
					timeout: commandTimeout(options),
					windowsHide: true,
				},
			);
			evidence = {
				status: 'passed',
				command: commandDisplay,
				observed: commandObservation(stdout, stderr, 'Exited with status 0.', credentialValues),
			};
		} catch (error) {
			evidence = {
				status: 'failed',
				command: commandDisplay,
				observed: commandObservation(
					error?.stdout,
					error?.stderr,
					error instanceof Error ? error.message : String(error),
					credentialValues,
				),
			};
		}
		for (const gateId of gateIds) {
			recordEvidence(node.evidenceMatrix, gateId, evidence);
		}
		const gates = gateIds.map((gateId) => node.evidenceMatrix.gates[gateId]);
		return {
			schemaVersion: 1,
			command,
			status: evidence.status === 'passed' ? 'passed' : 'blocked',
			nodeId: options.node,
			...(gates.length === 1 ? { gate: gates[0] } : { gates }),
		};
	}

	for (const required of [
		'packageDir',
		'expectedDirectory',
		'registrations',
		'crosswalk',
		'closure',
	]) {
		if (!options[required])
			throw new Error(
				`verify requires --${required.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
			);
	}
	if (!node.binding || !node.bindingDirectory) {
		throw new Error(`Node ${options.node} has no graph-planned binding name and directory`);
	}
	if (options.expectedDirectory !== node.bindingDirectory) {
		throw new Error(`--expected-directory must match the graph plan: ${node.bindingDirectory}`);
	}
	const workspaceRoot = manifest.workspaceRoot ?? path.dirname(path.resolve(options.workRoot));
	const plannedPackageDirectory = path.resolve(workspaceRoot, node.bindingDirectory);
	assertPlannedPathIsSafe(workspaceRoot, node.bindingDirectory);
	const packageDirectory = path.resolve(options.packageDir);
	if (canonicalPath(packageDirectory) !== canonicalPath(plannedPackageDirectory)) {
		throw new Error(
			`--package-dir must match the graph-planned workspace directory: ${plannedPackageDirectory}`,
		);
	}
	const registrations = readJson(options.registrations, 'registrations');
	const crosswalk = readJson(options.crosswalk, 'crosswalk');
	const closure = readJson(options.closure, 'closure');
	let crosswalkReport;
	try {
		crosswalkReport = validateUpstreamCrosswalk(
			registrations,
			crosswalk,
			node.upstreamTestInventory,
			plannedPackageDirectory,
		);
	} catch (error) {
		crosswalkReport = {
			status: 'blocked',
			issues: [error instanceof Error ? error.message : String(error)],
			cases: [],
		};
	}
	const attribution = attributionHashes(node);
	const packageReport = inspectBindingPackage(plannedPackageDirectory, {
		expectedPackageName: node.binding,
		expectedDirectory: options.expectedDirectory,
		identity: node.identity,
		expectedLicenseHashes: attribution.licenses,
		expectedNoticeHashes: attribution.notices,
	});
	const closureReport = auditShippedClosure({
		nodeId: options.node,
		graphNodes: manifest.nodes,
		runtimeDependencies: closure.runtimeDependencies ?? [],
		adaptedSources: closure.adaptedSources ?? [],
		sourceLedger: closure.sourceLedger,
		reimplementedDependencies: closure.reimplementedDependencies ?? [],
		evidenceRoot: plannedPackageDirectory,
		packageDirectory: plannedPackageDirectory,
	});
	setAutomatedGate(node.evidenceMatrix, 'upstream-crosswalk', crosswalkReport, {
		artifact: path.resolve(options.crosswalk),
		passedObserved: `${crosswalkReport.cases.length} upstream registrations classified`,
		repair: 'Restore every registration and supply local evidence or a durable rationale.',
	});
	for (const gateId of ['package-contract', 'provenance']) {
		setAutomatedGate(node.evidenceMatrix, gateId, packageReport, {
			artifact: plannedPackageDirectory,
			passedObserved: 'Package shape and durable provenance passed inspection.',
			repair: 'Complete the reported package/provenance artifacts and rerun verification.',
		});
	}
	setAutomatedGate(node.evidenceMatrix, 'closure-audit', closureReport, {
		artifact: path.resolve(options.closure),
		passedObserved:
			'Actual runtime imports, adapted sources, and clean-room proofs match the graph.',
		repair:
			'Return new runtime/adapted edges to classification and supply every planned clean-room proof.',
	});
	const readiness = evaluateVerificationReadiness({
		matrix: node.evidenceMatrix,
		crosswalkReport,
		packageReport,
		closureReport,
	});
	if (readiness.status === 'verified') {
		transitionNodeState(manifest, options.node, 'verified', {
			evidenceFingerprint: node.evidenceFingerprint,
			evidence: { crosswalkReport, packageReport, closureReport, readiness },
		});
	}
	return sanitizeForReport(
		{
			schemaVersion: 1,
			command,
			status: readiness.status === 'verified' ? 'passed' : 'blocked',
			nodeId: options.node,
			state: node.state,
			issues: readiness.issues,
			crosswalkReport,
			packageReport,
			closureReport,
		},
		'',
		credentialValues,
	);
}

export async function main({
	argumentsList = process.argv.slice(2),
	assertCommand = assertApprovedGateCommand,
} = {}) {
	let parsed;
	try {
		parsed = parseArguments(argumentsList);
	} catch (error) {
		process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n\n${usage()}`);
		process.exitCode = 2;
		return;
	}
	const batchDirectory = path.join(parsed.options.workRoot, parsed.options.batch);
	const manifestPath = path.join(batchDirectory, 'manifest.json');
	if (!existsSync(manifestPath)) {
		process.stderr.write(`Batch manifest does not exist: ${manifestPath}\n`);
		process.exitCode = 2;
		return;
	}
	let lock;
	try {
		lock = await acquireBatchLock(batchDirectory, {
			owner: `evidence-${process.pid}`,
			allowStaleRecovery: parsed.options.recoverStaleLock,
		});
		const manifest = validateBatchManifest(JSON.parse(readFileSync(manifestPath, 'utf8')));
		const report = await operate(
			parsed.command,
			parsed.options,
			manifest,
			batchDirectory,
			parsed.commandArguments,
			assertCommand,
		);
		await writeManifestAtomically(batchDirectory, manifest, { owner: lock.owner });
		process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
		if (report.status === 'blocked') process.exitCode = 2;
	} catch (error) {
		process.stderr.write(
			`${sanitizeForReport(error instanceof Error ? error.message : String(error), '', credentialValuesFromEnvironment())}\n`,
		);
		process.exitCode = 2;
	} finally {
		if (lock) await releaseBatchLock(lock);
	}
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	await main();
}
