import path from 'node:path';
import { defineCommand } from '../../kernel/command.js';
import { EXIT } from '../../kernel/errors.js';
import { applyConversionPlan, createConversionPlan } from '../../migrate/convert.js';

/** @param {string} root @param {string} file */
function relative(root, file) {
	const value = path.relative(root, file);
	return value && !value.startsWith('..') ? value : file;
}

export default defineCommand({
	description:
		'Create a minimal Octane-authored TSX edit plan. Dry-run is the default; pass --apply to write.',
	positionals: [
		{
			name: 'path',
			description: 'Eligible React leaf files or directories.',
			variadic: true,
			required: true,
		},
	],
	flags: {
		apply: {
			type: 'boolean',
			description: 'Write files whose analyzed digest still matches.',
		},
	},
	requiresProject: true,

	async run(ctx, input) {
		const project = ctx.project();
		const plan = createConversionPlan({
			root: project.root,
			entries: input.positionals.map((file) => path.resolve(ctx.cwd, file)),
		});

		/** @type {{ file: string, applied: boolean, conflict: boolean }[]} */
		let results = [];
		if (!plan.blocked && input.flags.apply) results = applyConversionPlan(plan);
		const conflicts = results.filter((result) => result.conflict).length;

		if (!ctx.json) {
			ctx.ui.intro('octane migrate convert');
			if (plan.blocked) {
				for (const finding of plan.report.findings.filter(
					(finding) => finding.severity === 'blocker',
				)) {
					ctx.ui.log(
						`BLOCKER ${finding.file ? relative(project.root, finding.file) : 'project'} ${finding.message}`,
					);
				}
				ctx.ui.outro('No edits were planned.');
			} else {
				for (const file of plan.files) {
					ctx.ui.log(
						`${input.flags.apply ? 'WRITE' : 'DRY-RUN'} ${relative(project.root, file.file)} — ${file.edits.length} edit(s)`,
					);
				}
				ctx.ui.outro(
					input.flags.apply
						? conflicts > 0
							? `${conflicts} file(s) changed after analysis and were not written.`
							: 'Conversion applied.'
						: 'No files written. Re-run with --apply after reviewing the plan.',
				);
			}
		}

		return {
			exitCode: plan.blocked || conflicts > 0 ? EXIT.DIAGNOSTIC : EXIT.OK,
			json: {
				ok: !plan.blocked && conflicts === 0,
				applied: Boolean(input.flags.apply),
				...plan,
				results,
			},
		};
	},
});
