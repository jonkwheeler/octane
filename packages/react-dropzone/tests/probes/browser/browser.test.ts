import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import { resolve } from 'node:path';
import { octane } from '../../../../octane/src/compiler/vite.js';

let server: ViteDevServer;
let browser: Browser;
let url: string;

beforeAll(async () => {
	server = await createServer({
		configFile: false,
		root: resolve(import.meta.dirname),
		plugins: [octane()],
		server: { host: '127.0.0.1', port: 0 },
	});
	await server.listen();
	const address = server.httpServer!.address();
	if (address === null || typeof address === 'string') throw new Error('missing Vite address');
	url = `http://127.0.0.1:${address.port}`;
	browser = await chromium.launch({ headless: true });
});

afterAll(async () => {
	await browser?.close();
	await server?.close();
});

describe('react-dropzone U1 trusted Chromium gate', () => {
	it('delivers chooser input and browser-created DataTransfer files', async () => {
		const page = await browser.newPage();
		const errors: string[] = [];
		page.on('pageerror', (error) => errors.push(error.message));
		await page.goto(url);
		const input = page.locator('input');
		await input.setInputFiles({
			name: 'chooser.txt',
			mimeType: 'text/plain',
			buffer: Buffer.from('chooser'),
		});
		await expect
			.poll(() => page.locator('body').getAttribute('data-last-drop'))
			.toBe('chooser.txt');
		await page.locator('[data-probe=root]').evaluate((root) => {
			const transfer = new DataTransfer();
			transfer.items.add(new File(['drop'], 'drop.txt', { type: 'text/plain' }));
			root.dispatchEvent(
				new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }),
			);
		});
		await expect.poll(() => page.locator('body').getAttribute('data-last-drop')).toBe('drop.txt');
		expect(errors).toEqual([]);
		await page.close();
	});
});
