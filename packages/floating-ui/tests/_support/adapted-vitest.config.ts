import { resolve } from 'node:path';

import { octane } from '../../../octane/src/compiler/vite.js';

const packageRoot = resolve(import.meta.dirname, '../..');

export default {
	plugins: [octane()],
	root: resolve(packageRoot, 'tests/upstream/unit'),
	test: {
		environment: 'jsdom',
		setupFiles: ['./setupTests.ts'],
		testTimeout: 30_000,
		hookTimeout: 30_000,
		globals: true,
	},
	define: {
		__DEV__: true,
	},
	resolve: {
		alias: [
			{
				find: /^octane$/,
				replacement: resolve(packageRoot, 'tests/_support/octane-react-compat.ts'),
			},
			{
				find: /^octane\/internal\/client$/,
				replacement: resolve(packageRoot, '../octane/src/internal/client.ts'),
			},
			{
				find: /^@radix-ui\/react-icons$/,
				replacement: resolve(packageRoot, 'tests/_support/radix-icons.tsx'),
			},
			{
				find: /^@radix-ui\/react-checkbox$/,
				replacement: resolve(packageRoot, 'tests/_support/radix-checkbox.tsx'),
			},
			{
				find: /^@octanejs\/floating-ui$/,
				replacement: resolve(packageRoot, 'src/index.ts'),
			},
		],
	},
};
