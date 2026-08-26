import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

const packageRoot = resolve(import.meta.dirname, '../..');

export default {
	plugins: [react()],
	root: resolve(packageRoot, 'upstream/test/unit'),
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
				find: /^@floating-ui\/react\/utils$/,
				replacement: resolve(packageRoot, 'upstream/src/utils.ts'),
			},
			{
				find: /^@floating-ui\/react$/,
				replacement: resolve(packageRoot, 'upstream/src/index.ts'),
			},
		],
	},
};
