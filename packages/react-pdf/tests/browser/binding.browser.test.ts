import { mkdtemp, rm } from 'node:fs/promises';
import { createServer as createNetServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { build, preview, type PreviewServer } from 'vite';

import { octane } from '../../../octane/src/compiler/vite.js';

const testRoot = dirname(fileURLToPath(import.meta.url));
const harnessRoot = resolve(testRoot, 'harness');
const repositoryRoot = resolve(testRoot, '../../../..');

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

let server: PreviewServer;
let outputRoot = '';
let origin = '';

beforeAll(async () => {
	const port = await getFreePort();
	outputRoot = await mkdtemp(join(tmpdir(), 'octane-react-pdf-binding-'));
	await build({
		configFile: false,
		root: harnessRoot,
		logLevel: 'error',
		plugins: [octane()],
		resolve: {
			alias: [
				{
					find: /^octane$/,
					replacement: resolve(repositoryRoot, 'packages/octane/src/index.ts'),
				},
				{
					find: /^@octanejs\/react-pdf$/,
					replacement: resolve(repositoryRoot, 'packages/react-pdf/src/index.ts'),
				},
			],
		},
		build: { outDir: outputRoot, emptyOutDir: true },
	});
	server = await preview({
		configFile: false,
		root: harnessRoot,
		logLevel: 'error',
		build: { outDir: outputRoot },
		preview: { host: '127.0.0.1', port, strictPort: true },
	});
	origin = `http://127.0.0.1:${port}`;
}, 60_000);

afterAll(async () => {
	await server?.close().catch(() => {});
	if (outputRoot) await rm(outputRoot, { recursive: true, force: true });
});

async function runBindingCase(engine: 'chromium' | 'firefox') {
	const playwright = await import('playwright');
	const browser = await playwright[engine].launch({ headless: true });
	const context = await browser.newContext({ viewport: { width: 900, height: 700 } });
	const page = await context.newPage();
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(String(error)));

	try {
		await page.goto(origin, { waitUntil: 'domcontentloaded' });
		try {
			await expect
				.poll(() => page.locator('#binding-probe').getAttribute('data-status'), { timeout: 15_000 })
				.toBe('ready');
		} catch (error) {
			const snapshot = await page.evaluate(() => ({
				attributes: Object.fromEntries(
					Array.from(document.querySelector('#binding-probe')?.attributes ?? []).map(
						(attribute) => [attribute.name, attribute.value],
					),
				),
				markup: document.querySelector('#binding-probe')?.innerHTML,
			}));
			throw new Error(`${String(error)}\n${JSON.stringify({ errors, snapshot }, null, 2)}`);
		}
		expect(
			Number(await page.locator('#binding-probe').getAttribute('data-worker-count')),
		).toBeGreaterThan(0);
		expect(
			await page.locator('.react-pdf__Page .react-pdf__Page__canvas').getAttribute('width'),
		).toBe('300');
		expect(await page.locator('.react-pdf__Page .textLayer').textContent()).toContain(
			'Octane PDF probe',
		);
		expect(await page.locator('.react-pdf__Page .annotationLayer a').getAttribute('href')).toBe(
			'https://octanejs.com/',
		);
		expect(await page.locator('.react-pdf__Outline').textContent()).toContain('Probe page');
		expect(await page.locator('.react-pdf__Thumbnail__page canvas').count()).toBe(1);

		await page.click('.react-pdf__Outline a');
		await expect
			.poll(() => page.locator('#binding-probe').getAttribute('data-item-click'))
			.toBe('0:1');
		await page.click('.react-pdf__Thumbnail');
		await expect
			.poll(() => page.locator('#binding-probe').getAttribute('data-thumbnail-click'))
			.toBe('0:1');
		expect(errors).toEqual([]);
	} finally {
		await context.close();
		await browser.close();
	}
}

describe('@octanejs/react-pdf browser contract', () => {
	it('renders the binding in Chromium', () => runBindingCase('chromium'), 90_000);
	it('renders the binding in Firefox', () => runBindingCase('firefox'), 90_000);
});
