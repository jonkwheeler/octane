#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const arguments_ = process.argv.slice(2);
const reportDirectory = process.env.REACT_PORT_TEST_REPORT_DIR;
const isTestInvocation = arguments_.some(
	(argument) => argument === '--test' || argument.startsWith('--test='),
);

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
	executedArguments = [`--test-reporter=${pathToFileURL(reporterPath).href}`, ...arguments_];
}

const childEnvironment = { ...process.env };
delete childEnvironment.NODE_TEST_CONTEXT;
const result = spawnSync(process.execPath, executedArguments, {
	encoding: invocationPath ? 'utf8' : undefined,
	env: childEnvironment,
	stdio: invocationPath ? ['inherit', 'pipe', 'inherit'] : 'inherit',
	windowsHide: true,
});

if (invocationPath) {
	if (typeof result.stdout === 'string' && result.stdout.trim()) {
		writeFileSync(reportPath, result.stdout);
		try {
			const report = JSON.parse(result.stdout);
			const passed = Number(report.numPassedTests ?? 0);
			const failed = Number(report.numFailedTests ?? 0);
			const skipped = Number(report.numPendingTests ?? 0);
			const todo = Number(report.numTodoTests ?? 0);
			process.stdout.write(
				`# tests ${passed + failed + skipped + todo}\n# pass ${passed}\n# fail ${failed}\n# skipped ${skipped}\n# todo ${todo}\n`,
			);
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
