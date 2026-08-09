import { readFileSync } from 'node:fs';
import { createServer as createNetServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type ViteDevServer } from 'vite';

const testDir = dirname(fileURLToPath(import.meta.url));
const harnessRoot = resolve(testDir, 'e2e');
const oraclePath = resolve(
	testDir,
	'../../upstream/test/e2e/snapshot.test.ts-snapshots/should-match-previous-one-1-linux.png',
);
const MAX_DIFF_RATIO = 0.02;

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

async function comparePngToOracle(
	page: import('playwright').Page,
	actualPng: Buffer,
	expectedPng: Buffer,
): Promise<{ ok: boolean; diffRatio: number; width: number; height: number; reason?: string }> {
	return page.evaluate(
		async function (payload) {
			async function decode(dataUrl: string) {
				const image = new Image();
				image.src = dataUrl;
				await image.decode();
				const canvas = document.createElement('canvas');
				canvas.width = image.width;
				canvas.height = image.height;
				const context = canvas.getContext('2d');
				if (!context) throw new Error('2d context unavailable');
				context.drawImage(image, 0, 0);
				return context.getImageData(0, 0, image.width, image.height);
			}
			const actual = await decode(payload.actualDataUrl);
			const expected = await decode(payload.expectedDataUrl);
			if (actual.width !== expected.width || actual.height !== expected.height) {
				return {
					ok: false,
					diffRatio: 1,
					width: actual.width,
					height: actual.height,
					reason: `size ${actual.width}x${actual.height} != ${expected.width}x${expected.height}`,
				};
			}
			let differingBytes = 0;
			for (let index = 0; index < actual.data.length; index++) {
				if (actual.data[index] !== expected.data[index]) differingBytes += 1;
			}
			const diffRatio = differingBytes / actual.data.length;
			return {
				ok: diffRatio <= payload.maxDiffRatio,
				diffRatio,
				width: actual.width,
				height: actual.height,
			};
		},
		{
			actualDataUrl: `data:image/png;base64,${actualPng.toString('base64')}`,
			expectedDataUrl: `data:image/png;base64,${expectedPng.toString('base64')}`,
			maxDiffRatio: MAX_DIFF_RATIO,
		},
	);
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

		const actual = await canvas.screenshot({ type: 'png' });
		const expected = readFileSync(oraclePath);
		const comparison = await comparePngToOracle(page, actual, expected);
		expect(comparison.reason, JSON.stringify(comparison)).toBeUndefined();
		expect(comparison.diffRatio, JSON.stringify(comparison)).toBeLessThanOrEqual(MAX_DIFF_RATIO);
		expect(comparison.ok, JSON.stringify(comparison)).toBe(true);
		await page.close();
	});
});
