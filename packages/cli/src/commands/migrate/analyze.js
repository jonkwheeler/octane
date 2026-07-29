import path from 'node:path';
import { defineCommand } from '../../kernel/command.js';
import { EXIT } from '../../kernel/errors.js';
import { analyzeMigration } from '../../migrate/analyze.js';

/** @param {string} root @param {string} file */
function relative(root, file) {
	const value = path.relative(root, file);
	return value && !value.startsWith('..') ? value : file;
}

export default defineCommand({
	description:
		'Build a read-only import closure and classify migration blockers, candidates, and known Octane bindings.',
	positionals: [
		{
			name: 'path',
			description: 'React leaf files to evaluate.',
			variadic: true,
			required: true,
		},
	],
	requiresProject: true,

	async run(ctx, input) {
		const project = ctx.project();
		const report = analyzeMigration({
			root: project.root,
			entries: input.positionals.map((file) => path.resolve(ctx.cwd, file)),
		});

		if (!ctx.json) {
			ctx.ui.intro('octane migrate analyze');
			for (const finding of report.findings) {
				const where = finding.file
					? `${relative(project.root, finding.file)}${
							finding.location ? `:${finding.location.line}:${finding.location.column}` : ''
						}`
					: 'project';
				ctx.ui.log(`${finding.severity.toUpperCase()} ${where} ${finding.message}`);
			}
			ctx.ui.outro(
				report.blocked
					? 'Migration is blocked; resolve every blocker before conversion.'
					: `Candidate boundary: ${report.candidateBoundaries
							.map((file) => relative(project.root, file))
							.join(', ')}`,
			);
		}

		return {
			exitCode: report.blocked ? EXIT.DIAGNOSTIC : EXIT.OK,
			json: { ok: !report.blocked, ...report },
		};
	},
});
