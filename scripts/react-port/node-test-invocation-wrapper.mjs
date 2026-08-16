#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OPTIONS_WITH_SEPARATE_VALUES = new Set([
	'-C',
	'-r',
	'--conditions',
	'--import',
	'--loader',
	'--require',
	'--test-concurrency',
	'--test-global-setup',
	'--test-name-pattern',
	'--test-reporter',
	'--test-reporter-destination',
	'--test-rerun-failures',
	'--test-shard',
	'--test-skip-pattern',
	'--test-timeout',
]);

function nodeRuntimeOptionBoundary(arguments_) {
	let consumesNextValue = false;
	for (let index = 0; index < arguments_.length; index += 1) {
		const argument = arguments_[index];
		if (consumesNextValue) {
			consumesNextValue = false;
			continue;
		}
		if (argument === '--' || argument === '-' || !argument.startsWith('-')) return index;
		if (!argument.includes('=') && OPTIONS_WITH_SEPARATE_VALUES.has(argument)) {
			consumesNextValue = true;
		}
	}
	return arguments_.length;
}

export function isNodeTestInvocation(arguments_) {
	return arguments_
		.slice(0, nodeRuntimeOptionBoundary(arguments_))
		.some((argument) => argument === '--test' || argument.startsWith('--test='));
}

function countTestReportOptions(arguments_) {
	return {
		destinations: arguments_.filter(
			(argument) =>
				argument === '--test-reporter-destination' ||
				argument.startsWith('--test-reporter-destination='),
		).length,
		reporters: arguments_.filter(
			(argument) => argument === '--test-reporter' || argument.startsWith('--test-reporter='),
		).length,
	};
}

function instrumentArguments(arguments_, reporterPath, reportPath) {
	const insertionIndex = nodeRuntimeOptionBoundary(arguments_);
	const { destinations, reporters } = countTestReportOptions(arguments_.slice(0, insertionIndex));
	const existingReporterDestination =
		reporters === 1 && destinations === 0 ? ['--test-reporter-destination=stdout'] : [];
	return [
		...arguments_.slice(0, insertionIndex),
		...existingReporterDestination,
		`--test-reporter=${pathToFileURL(reporterPath).href}`,
		`--test-reporter-destination=${reportPath}`,
		...arguments_.slice(insertionIndex),
	];
}

function printStableSummary(report) {
	const passed = Number(report.numPassedTests ?? 0);
	const failed = Number(report.numFailedTests ?? 0);
	const skipped = Number(report.numPendingTests ?? 0);
	const todo = Number(report.numTodoTests ?? 0);
	process.stdout.write(
		`# tests ${passed + failed + skipped + todo}\n# pass ${passed}\n# fail ${failed}\n# skipped ${skipped}\n# todo ${todo}\n`,
	);
}

function main() {
	const arguments_ = process.argv.slice(2);
	const reportDirectory = process.env.REACT_PORT_TEST_REPORT_DIR;
	const isTestInvocation = isNodeTestInvocation(arguments_);

	let invocationPath = null;
	let reportPath = null;
	let invocation = null;
	let executedArguments = arguments_;

	if (reportDirectory && isTestInvocation) {
		const invocationId = randomUUID();
		const reportFile = `node-test-${process.pid}-${invocationId}.report.json`;
		reportPath = path.join(reportDirectory, reportFile);
		invocationPath = path.join(
			reportDirectory,
			`node-test-${process.pid}-${invocationId}.invocation.json`,
		);
		invocation = {
			schemaVersion: 1,
			invocationId,
			runner: 'node-test',
			argv: arguments_,
			reportFile,
			status: 'running',
		};
		writeFileSync(invocationPath, JSON.stringify(invocation));
		const reporterPath = path.join(
			path.dirname(fileURLToPath(import.meta.url)),
			'node-test-reporter.mjs',
		);
		executedArguments = instrumentArguments(arguments_, reporterPath, reportPath);
	}

	const childEnvironment = { ...process.env };
	delete childEnvironment.NODE_TEST_CONTEXT;
	const result = spawnSync(process.execPath, executedArguments, {
		env: childEnvironment,
		stdio: 'inherit',
		windowsHide: true,
	});

	if (invocationPath) {
		if (existsSync(reportPath)) {
			try {
				printStableSummary(JSON.parse(readFileSync(reportPath, 'utf8')));
			} catch {
				// The evidence verifier reports malformed runner output with the invocation context.
			}
		}
		writeFileSync(
			invocationPath,
			JSON.stringify({
				...invocation,
				status: result.status,
				signal: result.signal,
				error: result.error?.message,
			}),
		);
	}

	if (result.signal) process.kill(process.pid, result.signal);
	process.exit(result.status ?? 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
