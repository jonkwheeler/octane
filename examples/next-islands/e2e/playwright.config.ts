import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: '.',
	fullyParallel: false,
	workers: 1,
	use: {
		baseURL: 'http://127.0.0.1:5240',
	},
	webServer: {
		command: 'pnpm start --port 5240',
		port: 5240,
		reuseExistingServer: false,
	},
});
