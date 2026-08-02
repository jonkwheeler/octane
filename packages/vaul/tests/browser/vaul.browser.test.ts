import { createServer as createNetServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type ViteDevServer } from 'vite';
import { octane } from '../../../octane/src/compiler/vite.js';

const testRoot = dirname(fileURLToPath(import.meta.url));
const harnessRoot = resolve(testRoot, 'harness');
const packageSrc = resolve(testRoot, '../../src/index.tsrx');
const octaneSrc = resolve(testRoot, '../../../octane/src/index.ts');

function getFreePort(): Promise<number> {
	return new Promise((resolvePort, reject) => {
		const server = createNetServer();
		server.once('error', reject);
		server.listen(0, '127.0.0.1', () => {
			const { port } = server.address() as import('node:net').AddressInfo;
			server.close(() => resolvePort(port));
		});
	});
}

let viteServer: ViteDevServer;
let browser: import('playwright').Browser;
let page: import('playwright').Page;

beforeAll(async () => {
	const { chromium } = await import('playwright');
	browser = await chromium.launch({ headless: true });
	const port = await getFreePort();
	viteServer = await createServer({
		root: harnessRoot,
		logLevel: 'error',
		server: { port, host: '127.0.0.1', strictPort: true },
		plugins: [octane()],
		resolve: {
			alias: [
				{ find: /^@octanejs\/vaul$/, replacement: packageSrc },
				{ find: /^octane$/, replacement: octaneSrc },
			],
		},
	});
	await viteServer.listen();
	page = await browser.newPage({ viewport: { width: 800, height: 800 } });
	await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'networkidle' });
}, 60_000);

afterAll(async () => {
	await page?.close().catch(() => {});
	await browser?.close().catch(() => {});
	await viteServer?.close().catch(() => {});
});

describe('vaul real-browser evidence', () => {
	it('preserves styling, focus semantics, snap points, dragging, and cleanup', async () => {
		await page.getByRole('button', { name: 'Open drawer' }).click();
		const drawer = page.locator('[data-vaul-drawer]');
		await drawer.waitFor();
		await expect
			.poll(() => drawer.evaluate((node) => node.contains(document.activeElement)))
			.toBe(true);
		await page.waitForFunction(() =>
			document.querySelector('[data-vaul-drawer]')?.getAttribute('style')?.includes('600px'),
		);
		expect(await page.locator('#drawer-state').textContent()).toBe('open');
		expect(await drawer.getAttribute('data-vaul-drawer-direction')).toBe('bottom');
		expect(await drawer.getAttribute('data-vaul-snap-points')).toBe('true');
		expect(await drawer.getAttribute('role')).toBe('dialog');
		expect(await drawer.evaluate((node) => getComputedStyle(node).position)).toBe('fixed');
		expect(
			await drawer.evaluate((node) =>
				getComputedStyle(node).getPropertyValue('--snap-point-height'),
			),
		).toBe('600px');

		await page.locator('[data-vaul-handle]').click();
		await page.waitForFunction(() => document.querySelector('#snap-point')?.textContent === '0.75');
		expect(
			await drawer.evaluate((node) =>
				getComputedStyle(node).getPropertyValue('--snap-point-height'),
			),
		).toBe('200px');

		await page.waitForTimeout(550);
		const box = await drawer.boundingBox();
		if (!box) throw new Error('drawer has no browser box');
		await page.mouse.move(box.x + box.width / 2, box.y + 30);
		await page.mouse.down();
		await page.mouse.move(box.x + box.width / 2, box.y + 140, { steps: 4 });
		expect(await drawer.evaluate((node) => node.classList.contains('vaul-dragging'))).toBe(true);
		await page.mouse.up();
		await expect.poll(() => page.locator('#drawer-state').textContent()).toBe('open');
		expect(await page.locator('[data-vaul-drawer]').count()).toBe(1);

		await page.getByRole('button', { name: 'Close drawer' }).click();
		await page.waitForFunction(
			() => document.querySelector('#drawer-state')?.textContent === 'closed',
		);
		await page.waitForTimeout(550);
		expect(await page.locator('[data-vaul-drawer]').count()).toBe(0);
		await expect
			.poll(() =>
				page
					.getByRole('button', { name: 'Open drawer' })
					.evaluate((node) => node === document.activeElement),
			)
			.toBe(true);
	});
});
