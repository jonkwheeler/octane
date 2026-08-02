import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';

const root = resolve(import.meta.dirname, '../..');

export default defineConfig({
	root,
	resolve: { dedupe: ['vitest'] },
	test: {
		environment: 'jsdom',
		include: ['packages/react-resizable-panels/upstream/source/lib/**/*.test.{ts,tsx}'],
		setupFiles: ['packages/react-resizable-panels/upstream/source/vitest.setup.ts'],
		server: {
			deps: { inline: ['@testing-library/jest-dom', 'vitest-fail-on-console'] },
		},
	},
});
