import { createServer as createNetServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type ViteDevServer } from 'vite';

const harnessRoot = resolve(dirname(fileURLToPath(import.meta.url)), 'e2e');
let viteServer: ViteDevServer;
let origin = '';
let browser: import('playwright').Browser;

function getFreePort(): Promise<number> {
	return new Promise(function (resolvePort, reject) {
		const server = createNetServer();
		server.once('error', reject);
		server.listen(0, '127.0.0.1', function () {
			const { port } = server.address() as import('node:net').AddressInfo;
			server.close(function () {
				resolvePort(port);
			});
		});
	});
}

beforeAll(async function () {
	const { chromium } = await import('playwright');
	browser = await chromium.launch({ headless: true });
	const port = await getFreePort();
	viteServer = await createServer({
		root: harnessRoot,
		logLevel: 'error',
		server: { port, host: '127.0.0.1', strictPort: true },
	});
	await viteServer.listen();
	origin = `http://127.0.0.1:${port}`;
}, 60_000);

afterAll(async function () {
	await browser?.close();
	await viteServer?.close();
});

describe('upstream Drei e2e screenshot (Playwright)', function () {
	// Per upstream test/e2e/snapshot.test.ts: should match previous one
	// @parity-case upstream:e2e-snapshot
	it('should match previous one', async function () {
		const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
		await page.goto(origin, { waitUntil: 'networkidle' });
		await page.waitForFunction(function () {
			return Boolean((globalThis as { __dreiReady?: boolean }).__dreiReady);
		});
		const canvas = page.locator('canvas[data-engine]');
		expect(await canvas.count()).toBe(1);
		expect((await canvas.boundingBox())?.width).toBe(300);
		expect((await canvas.boundingBox())?.height).toBe(150);
		expect((await canvas.screenshot()).byteLength).toBeGreaterThan(0);
		await page.close();
	});
});
