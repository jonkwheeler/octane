#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import {
	auditShippedClosure,
	createEvidenceMatrix,
	evaluateVerificationReadiness,
	inspectBindingPackage,
	recordEvidence,
	validateUpstreamCrosswalk,
} from './evidence-lib.mjs';
import { sanitizeForReport } from './preflight-lib.mjs';
import {
	acquireBatchLock,
	releaseBatchLock,
	transitionNodeState,
	validateBatchManifest,
	writeManifestAtomically,
} from './state-lib.mjs';

const execFileAsync = promisify(execFile);
const DEFAULT_COMMAND_TIMEOUT_MS = 10 * 60 * 1_000;
const MAX_COMMAND_TIMEOUT_MS = 30 * 60 * 1_000;
const MAX_COMMAND_OUTPUT_BYTES = 1024 * 1024;

function usage() {
	return `Usage:
  node scripts/react-port/evidence.mjs init --batch <id> --node <pkg:id> --category <kind> [...]
  node scripts/react-port/evidence.mjs record --batch <id> --node <pkg:id> --gate <id> --status <status> [evidence]
  node scripts/react-port/evidence.mjs run --batch <id> --node <pkg:id> --gate <id> -- <executable> [args...]
  node scripts/react-port/evidence.mjs verify --batch <id> --node <pkg:id> --package-dir <path> \
    --expected-directory <repo-path> --registrations <json> --crosswalk <json> --closure <json>

Common options:
  --work-root <directory>  Batch root (default: .react-port-work)
  --recover-stale-lock     Explicitly recover a lock older than 30 minutes

Use run for command-backed passed/failed evidence; commands execute directly
without a shell. Record accepts existing --artifact evidence, blocked rows with
--reason and --repair, or inapplicable rows with --reason.
`;
}

function parseArguments(arguments_) {
	const separatorIndex = arguments_.indexOf('--');
	const optionArguments = separatorIndex === -1 ? arguments_ : arguments_.slice(0, separatorIndex);
	const commandArguments = separatorIndex === -1 ? [] : arguments_.slice(separatorIndex + 1);
	const command = optionArguments[0];
	if (!['init', 'record', 'run', 'verify'].includes(command))
		throw new Error('Expected init, record, run, or verify');
	const options = { category: [], workRoot: path.join(process.cwd(), '.react-port-work') };
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
		if (name === 'category') options.category.push(value);
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

function commandObservation(stdout, stderr, fallback) {
	const output = [stdout, stderr].filter(Boolean).join('\n').trim();
	return sanitizeForReport(output || fallback);
}

async function operate(command, options, manifest, batchDirectory, commandArguments) {
	const node = manifest.nodes[options.node];
	if (!node) throw new Error(`Batch has no node ${options.node}`);

	if (command === 'init') {
		if (node.state !== 'ready' && node.state !== 'implementing') {
			throw new Error(`Evidence can start only from ready/implementing, received ${node.state}`);
		}
		if (options.category.length === 0) throw new Error('init requires at least one --category');
		if (node.state === 'ready') {
			node.evidenceMatrix = createEvidenceMatrix({
				categories: options.category,
				preflightArtifact: `.react-port-work/${manifest.batchId}/manifest.json`,
			});
			transitionNodeState(manifest, options.node, 'implementing', {
				evidenceFingerprint: node.evidenceFingerprint,
			});
		} else if (
			!node.evidenceMatrix ||
			JSON.stringify(node.evidenceMatrix.categories) !==
				JSON.stringify([...new Set(options.category)].sort())
		) {
			throw new Error('Implementing node already has a different evidence category matrix');
		}
		return { schemaVersion: 1, command, status: 'passed', nodeId: options.node, state: node.state };
	}

	if (node.state !== 'implementing' || !node.evidenceMatrix) {
		throw new Error(
			`Node ${options.node} must be implementing with an initialized evidence matrix`,
		);
	}
	if (command === 'record') {
		if (!options.gate || !options.status) throw new Error('record requires --gate and --status');
		if (options.command) {
			throw new Error('record cannot claim command evidence; use run -- <executable> [args...]');
		}
		if (['passed', 'failed'].includes(options.status)) {
			if (!options.artifact) {
				throw new Error('record passed/failed evidence requires an existing --artifact');
			}
			options.artifact = path.resolve(options.artifact);
			if (!existsSync(options.artifact)) {
				throw new Error(`record artifact does not exist: ${options.artifact}`);
			}
		}
		const evidence = sanitizeForReport({
			status: options.status,
			command: options.command,
			artifact: options.artifact,
			observed: options.observed,
			reason: options.reason,
			repair: options.repair,
		});
		recordEvidence(node.evidenceMatrix, options.gate, evidence);
		return {
			schemaVersion: 1,
			command,
			status: 'passed',
			nodeId: options.node,
			gate: node.evidenceMatrix.gates[options.gate],
		};
	}
	if (command === 'run') {
		if (!options.gate) throw new Error('run requires --gate');
		if (commandArguments.length === 0) {
			throw new Error('run requires an executable and arguments after --');
		}
		const commandDisplay = JSON.stringify(commandArguments);
		let evidence;
		try {
			const { stdout, stderr } = await execFileAsync(
				commandArguments[0],
				commandArguments.slice(1),
				{
					cwd: process.cwd(),
					encoding: 'utf8',
					maxBuffer: MAX_COMMAND_OUTPUT_BYTES,
					timeout: commandTimeout(options),
					windowsHide: true,
				},
			);
			evidence = {
				status: 'passed',
				command: commandDisplay,
				observed: commandObservation(stdout, stderr, 'Exited with status 0.'),
			};
		} catch (error) {
			evidence = {
				status: 'failed',
				command: commandDisplay,
				observed: commandObservation(
					error?.stdout,
					error?.stderr,
					error instanceof Error ? error.message : String(error),
				),
			};
		}
		recordEvidence(node.evidenceMatrix, options.gate, evidence);
		return {
			schemaVersion: 1,
			command,
			status: evidence.status === 'passed' ? 'passed' : 'blocked',
			nodeId: options.node,
			gate: node.evidenceMatrix.gates[options.gate],
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
	const registrations = readJson(options.registrations, 'registrations');
	const crosswalk = readJson(options.crosswalk, 'crosswalk');
	const closure = readJson(options.closure, 'closure');
	let crosswalkReport;
	try {
		crosswalkReport = validateUpstreamCrosswalk(registrations, crosswalk);
	} catch (error) {
		crosswalkReport = {
			status: 'blocked',
			issues: [error instanceof Error ? error.message : String(error)],
			cases: [],
		};
	}
	const attribution = attributionHashes(node);
	const packageReport = inspectBindingPackage(path.resolve(options.packageDir), {
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
	});
	setAutomatedGate(node.evidenceMatrix, 'upstream-crosswalk', crosswalkReport, {
		artifact: path.resolve(options.crosswalk),
		passedObserved: `${crosswalkReport.cases.length} upstream registrations classified`,
		repair: 'Restore every registration and supply local evidence or a durable rationale.',
	});
	for (const gateId of ['package-contract', 'provenance']) {
		setAutomatedGate(node.evidenceMatrix, gateId, packageReport, {
			artifact: path.resolve(options.packageDir),
			passedObserved: 'Package shape and durable provenance passed inspection.',
			repair: 'Complete the reported package/provenance artifacts and rerun verification.',
		});
	}
	setAutomatedGate(node.evidenceMatrix, 'closure-audit', closureReport, {
		artifact: path.resolve(options.closure),
		passedObserved: 'Actual runtime imports and adapted sources match the licensed graph.',
		repair: 'Return new runtime/adapted edges to classification and exact-MIT preflight.',
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
	return sanitizeForReport({
		schemaVersion: 1,
		command,
		status: readiness.status === 'verified' ? 'passed' : 'blocked',
		nodeId: options.node,
		state: node.state,
		issues: readiness.issues,
		crosswalkReport,
		packageReport,
		closureReport,
	});
}

async function main() {
	let parsed;
	try {
		parsed = parseArguments(process.argv.slice(2));
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
		);
		await writeManifestAtomically(batchDirectory, manifest, { owner: lock.owner });
		process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
		if (report.status === 'blocked') process.exitCode = 2;
	} catch (error) {
		process.stderr.write(
			`${sanitizeForReport(error instanceof Error ? error.message : String(error))}\n`,
		);
		process.exitCode = 2;
	} finally {
		if (lock) await releaseBatchLock(lock);
	}
}

await main();
