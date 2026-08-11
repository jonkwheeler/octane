import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateBatchManifest } from './state-lib.mjs';

function parseArguments(argv) {
	const options = { workRoot: '.react-port-work' };
	for (let index = 0; index < argv.length; index += 1) {
		const argument = argv[index];
		if (argument === '--batch') options.batch = argv[++index];
		else if (argument === '--work-root') options.workRoot = argv[++index];
		else throw new Error(`Unknown argument: ${argument}`);
	}
	if (!options.batch) throw new Error('Missing required --batch <id>');
	return options;
}

export function terminalBatchReport(manifest) {
	validateBatchManifest(manifest);
	const requested = Object.values(manifest.nodes).filter((node) => node.requested);
	if (requested.length === 0) throw new Error('Batch manifest has no requested targets');
	const unfinished = requested.filter(
		(node) =>
			node.state !== 'verified' &&
			node.disposition !== 'satisfied' &&
			node.disposition !== 'hard-blocked',
	);
	return {
		schemaVersion: 1,
		status: unfinished.length === 0 ? 'terminal' : 'unfinished',
		requested: requested.map((node) => ({
			id: node.id,
			state: node.state,
			disposition:
				node.disposition === 'satisfied'
					? 'satisfied'
					: node.state === 'verified'
						? 'verified'
						: node.disposition,
		})),
		unfinished: unfinished.map((node) => node.id),
	};
}

function main() {
	try {
		const options = parseArguments(process.argv.slice(2));
		const manifestPath = path.join(options.workRoot, options.batch, 'manifest.json');
		if (!existsSync(manifestPath))
			throw new Error(`Batch manifest does not exist: ${manifestPath}`);
		const report = terminalBatchReport(JSON.parse(readFileSync(manifestPath, 'utf8')));
		process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
		if (report.status !== 'terminal') process.exitCode = 2;
	} catch (error) {
		process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
		process.exitCode = 2;
	}
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) main();
