#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
	assessResolvedEvidence,
	resolveRemoteInput,
	runPreflight,
	sanitizeForReport,
} from './preflight-lib.mjs';
import { planPortGraph, readRepositoryCapabilityInventory } from './graph-lib.mjs';
import {
	acquireBatchLock,
	captureWorktreeBaseline,
	createBatchManifest,
	reconcileBatchManifest,
	releaseBatchLock,
	writeManifestAtomically,
} from './state-lib.mjs';

function usage() {
	return `Usage: node scripts/react-port/preflight.mjs [options] <package-or-url> [...]

Resolve one or more public npm/GitHub inputs, verify immutable provenance, and
enforce Octane's exact-MIT source-adaptation policy before binding writes.

Options:
  --fixture-evidence <file>  Read deterministic local evidence; disables networking
  --prerequisite <input>     Add a discovered prerequisite without marking it requested
  --classify <package=kind>  Classify a dependency as framework-neutral,
                             react-coupled, or unsupported (repeatable)
  --batch <id>               Use a stable batch identifier (derived by default)
  --work-root <directory>    Store state below this directory (default: .react-port-work)
  --recover-stale-lock       Explicitly recover a lock older than 30 minutes
  --no-state                 Print a report without writing resumable state
  -h, --help                 Show this help
`;
}

function parseArguments(arguments_) {
	const inputs = [];
	const prerequisiteInputs = [];
	let fixtureEvidencePath = null;
	let batchId = null;
	let workRoot = path.join(process.cwd(), '.react-port-work');
	let noState = false;
	let recoverStaleLock = false;
	const dependencyClassifications = {};
	for (let index = 0; index < arguments_.length; index += 1) {
		const argument = arguments_[index];
		if (argument === '-h' || argument === '--help') {
			return {
				help: true,
				inputs,
				prerequisiteInputs,
				fixtureEvidencePath,
				batchId,
				workRoot,
				noState,
				recoverStaleLock,
				dependencyClassifications,
			};
		}
		if (argument === '--fixture-evidence') {
			fixtureEvidencePath = arguments_[index + 1];
			if (!fixtureEvidencePath) throw new Error('--fixture-evidence requires a file path');
			index += 1;
			continue;
		}
		if (argument === '--prerequisite') {
			const prerequisite = arguments_[index + 1];
			if (!prerequisite) throw new Error('--prerequisite requires a package input');
			prerequisiteInputs.push(prerequisite);
			index += 1;
			continue;
		}
		if (argument === '--classify') {
			const classification = arguments_[index + 1];
			const separator = classification?.lastIndexOf('=') ?? -1;
			const packageName = separator > 0 ? classification.slice(0, separator) : '';
			const kind = separator > 0 ? classification.slice(separator + 1) : '';
			if (!packageName || !['framework-neutral', 'react-coupled', 'unsupported'].includes(kind)) {
				throw new Error('--classify requires package=framework-neutral|react-coupled|unsupported');
			}
			dependencyClassifications[packageName] = kind;
			index += 1;
			continue;
		}
		if (argument === '--batch') {
			batchId = arguments_[index + 1];
			if (!batchId || !/^[a-z0-9][a-z0-9._-]*$/i.test(batchId)) {
				throw new Error('--batch requires a path-safe identifier');
			}
			index += 1;
			continue;
		}
		if (argument === '--work-root') {
			if (!arguments_[index + 1]) throw new Error('--work-root requires a directory');
			workRoot = path.resolve(arguments_[index + 1]);
			index += 1;
			continue;
		}
		if (argument === '--recover-stale-lock') {
			recoverStaleLock = true;
			continue;
		}
		if (argument === '--no-state') {
			noState = true;
			continue;
		}
		if (argument.startsWith('-')) throw new Error(`Unknown option: ${argument}`);
		inputs.push(argument);
	}
	return {
		help: false,
		inputs,
		prerequisiteInputs,
		fixtureEvidencePath,
		batchId,
		workRoot,
		noState,
		recoverStaleLock,
		dependencyClassifications,
	};
}

function loadFixtureEvidence(filePath) {
	let fixture;
	try {
		fixture = JSON.parse(readFileSync(path.resolve(filePath), 'utf8'));
	} catch (error) {
		throw new Error(
			`Could not read fixture evidence: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
	if (fixture.schemaVersion !== 1 || !fixture.targets || typeof fixture.targets !== 'object') {
		throw new Error('Fixture evidence must use schemaVersion 1 and contain a targets object');
	}
	return fixture;
}

async function main() {
	let parsedArguments;
	try {
		parsedArguments = parseArguments(process.argv.slice(2));
	} catch (error) {
		process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n\n${usage()}`);
		process.exitCode = 2;
		return;
	}
	if (parsedArguments.help) {
		process.stdout.write(usage());
		return;
	}
	if (parsedArguments.inputs.length === 0) {
		process.stderr.write(usage());
		process.exitCode = 2;
		return;
	}

	let fixture = null;
	try {
		fixture = parsedArguments.fixtureEvidencePath
			? loadFixtureEvidence(parsedArguments.fixtureEvidencePath)
			: null;
	} catch (error) {
		const report = {
			schemaVersion: 1,
			status: 'blocked',
			targets: [...parsedArguments.inputs, ...parsedArguments.prerequisiteInputs].map((input) => ({
				input,
				status: 'blocked',
				blockers: [sanitizeForReport(error instanceof Error ? error.message : String(error))],
				repair: 'Correct the local fixture evidence path or schema.',
			})),
		};
		process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
		process.exitCode = 2;
		return;
	}

	const report = await runPreflight({
		inputs: [...parsedArguments.inputs, ...parsedArguments.prerequisiteInputs],
		resolve: fixture
			? async (_parsedInput, rawInput) => {
					const evidence = fixture.targets[rawInput];
					if (!evidence) throw new Error(`Fixture evidence has no target for ${rawInput}`);
					return {
						...assessResolvedEvidence({ input: rawInput, ...evidence }),
						runtimeDependencies: evidence.registry?.runtimeDependencies ?? {},
					};
				}
			: (parsedInput, rawInput) =>
					resolveRemoteInput(parsedInput, rawInput, {
						githubToken: process.env.GITHUB_TOKEN,
						npmToken: process.env.NODE_AUTH_TOKEN ?? process.env.NPM_TOKEN,
					}),
	});
	const requestedInputs = new Set(parsedArguments.inputs);
	for (const target of report.targets) target.requested = requestedInputs.has(target.input);
	const inventory = readRepositoryCapabilityInventory();
	const graph = planPortGraph({
		targets: report.targets,
		inventory,
		dependencyClassifications: parsedArguments.dependencyClassifications,
	});
	report.capabilityInventory = {
		fingerprint: inventory.fingerprint,
		bindingCount: Object.keys(inventory.bindings).length,
		knownReactPackageCount: Object.keys(inventory.sourceBindings).length,
		knownVanillaCoreCount: Object.keys(inventory.vanillaCores).length,
		reactApiCount: Object.keys(inventory.reactApis).length,
	};
	report.graph = graph;
	report.preflightStatus = report.status;
	const requestedNodes = Object.values(graph.nodes).filter((node) => node.requested);
	const blockedRequestedNodes = requestedNodes.filter((node) => node.state === 'blocked').length;
	report.status =
		blockedRequestedNodes === requestedNodes.length
			? 'blocked'
			: blockedRequestedNodes > 0
				? 'partial'
				: 'passed';

	if (!parsedArguments.noState) {
		const batchId = parsedArguments.batchId ?? `port-${graph.fingerprint.slice(0, 12)}`;
		const batchDirectory = path.join(parsedArguments.workRoot, batchId);
		let lock;
		try {
			lock = await acquireBatchLock(batchDirectory, {
				owner: `preflight-${process.pid}`,
				allowStaleRecovery: parsedArguments.recoverStaleLock,
			});
			const nextManifest = createBatchManifest({
				batchId,
				inventoryFingerprint: inventory.fingerprint,
				graphFingerprint: graph.fingerprint,
				nodes: graph.nodes,
				baseline: captureWorktreeBaseline(),
			});
			const manifestPath = path.join(batchDirectory, 'manifest.json');
			const manifest = existsSync(manifestPath)
				? reconcileBatchManifest(JSON.parse(readFileSync(manifestPath, 'utf8')), nextManifest)
				: nextManifest;
			await writeManifestAtomically(batchDirectory, manifest, { owner: lock.owner });
			report.batch = {
				batchId,
				resume: manifest.resume ?? { invalidated: [], preserved: [] },
			};
		} catch (error) {
			report.batch = {
				batchId,
				status: 'blocked',
				blockers: [sanitizeForReport(error instanceof Error ? error.message : String(error))],
				repair: 'Resolve the state-directory or one-writer lock problem, then rerun preflight.',
			};
			process.exitCode = 2;
		} finally {
			if (lock) await releaseBatchLock(lock);
		}
	}

	process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
	if (report.status === 'blocked') process.exitCode = 2;
}

await main();
