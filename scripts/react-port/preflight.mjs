#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
	assessResolvedEvidence,
	resolveRemoteInput,
	runPreflight,
	sanitizeForReport,
} from './preflight-lib.mjs';

function usage() {
	return `Usage: node scripts/react-port/preflight.mjs [options] <package-or-url> [...]

Resolve one or more public npm/GitHub inputs, verify immutable provenance, and
enforce Octane's exact-MIT source-adaptation policy before binding writes.

Options:
  --fixture-evidence <file>  Read deterministic local evidence; disables networking
  -h, --help                 Show this help
`;
}

function parseArguments(arguments_) {
	const inputs = [];
	let fixtureEvidencePath = null;
	for (let index = 0; index < arguments_.length; index += 1) {
		const argument = arguments_[index];
		if (argument === '-h' || argument === '--help')
			return { help: true, inputs, fixtureEvidencePath };
		if (argument === '--fixture-evidence') {
			fixtureEvidencePath = arguments_[index + 1];
			if (!fixtureEvidencePath) throw new Error('--fixture-evidence requires a file path');
			index += 1;
			continue;
		}
		if (argument.startsWith('-')) throw new Error(`Unknown option: ${argument}`);
		inputs.push(argument);
	}
	return { help: false, inputs, fixtureEvidencePath };
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
			targets: parsedArguments.inputs.map((input) => ({
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
		inputs: parsedArguments.inputs,
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

	process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
	if (report.status === 'blocked') process.exitCode = 2;
}

await main();
