import { defineCommand } from '../../kernel/command.js';

export default defineCommand({
	description: 'Analyze and conservatively migrate React leaves into Octane islands.',
	subcommands: [
		{
			name: 'analyze',
			summary: 'Report source and dependency blockers for selected React leaves.',
			load: () => import('./analyze.js'),
		},
		{
			name: 'convert',
			summary: 'Plan or apply a conservative Octane TSX conversion.',
			load: () => import('./convert.js'),
		},
	],
});
