/**
 * Adapted Octane browser lane: same scenarios as upstream
 * test/browser/waypoint_test.jsx, driven in real Chromium via Playwright.
 *
 * // Per packages/waypoint/upstream/test/browser/waypoint_test.jsx
 */
import { createServer as createNetServer } from 'node:net';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type ViteDevServer } from 'vite';
import { octane } from '../../../../octane/src/compiler/vite.js';

const browserTestRoot = dirname(fileURLToPath(import.meta.url));
const packageRequire = createRequire(resolve(browserTestRoot, '../../../package.json'));
const harnessRoot = resolve(browserTestRoot, 'harness');
const packageSrc = resolve(browserTestRoot, '../../../src/index.ts');
const octaneSrc = resolve(browserTestRoot, '../../../../octane/src/index.ts');
const identitiesPath = resolve(browserTestRoot, '../_shared/upstream-browser-identities.json');
const expectedIdentities = (JSON.parse(readFileSync(identitiesPath, 'utf8')) as { tests: string[] })
	.tests;
const jasmineCss = packageRequire.resolve('jasmine-core/lib/jasmine-core/jasmine.css');
const jasmineJs = packageRequire.resolve('jasmine-core/lib/jasmine-core/jasmine.js');
const jasmineBootJs = resolve(harnessRoot, 'jasmine-boot.js');

function getFreePort(): Promise<number> {
	return new Promise(function listen(resolvePort, reject) {
		const server = createNetServer();
		server.once('error', reject);
		server.listen(0, '127.0.0.1', function onListening() {
			const address = server.address() as import('node:net').AddressInfo;
			const port = address.port;
			server.close(function onClose() {
				resolvePort(port);
			});
		});
	});
}

let viteServer: ViteDevServer;
let browser: import('playwright').Browser;
let suiteResults: Array<{ fullName: string; status: string; failedExpectations: unknown[] }>;

beforeAll(async function setupAdaptedBrowser() {
	try {
		const playwright = await import('playwright');
		browser = await playwright.chromium.launch({ headless: true });
	} catch (error) {
		throw new Error(
			'[@octanejs/waypoint adapted browser] Chromium is required ' +
				'(run `pnpm exec playwright install chromium`): ' +
				(error instanceof Error ? error.message.split('\n')[0] : String(error)),
		);
	}

	const port = await getFreePort();

	viteServer = await createServer({
		root: harnessRoot,
		logLevel: 'error',
		esbuild: {
			jsx: 'transform',
			jsxFactory: 'React.createElement',
			jsxFragment: 'React.Fragment',
		},
		server: {
			host: '127.0.0.1',
			port,
			strictPort: true,
			fs: {
				allow: [resolve(browserTestRoot, '../../../..'), harnessRoot],
			},
		},
		plugins: [
			octane(),
			{
				name: 'waypoint-jasmine-assets',
				configureServer(server) {
					server.middlewares.use('/jasmine.css', function serveCss(_req, res) {
						res.setHeader('Content-Type', 'text/css');
						res.end(readFileSync(jasmineCss));
					});
					server.middlewares.use('/jasmine.js', function serveJs(_req, res) {
						res.setHeader('Content-Type', 'text/javascript');
						res.end(readFileSync(jasmineJs));
					});
					server.middlewares.use('/jasmine-boot.js', function serveBoot(_req, res) {
						res.setHeader('Content-Type', 'text/javascript');
						res.end(readFileSync(jasmineBootJs));
					});
				},
			},
		],
		resolve: {
			alias: [
				{
					find: /^@octanejs\/waypoint$/,
					replacement: packageSrc,
				},
				{
					find: /^octane$/,
					replacement: octaneSrc,
				},
			],
		},
	});
	await viteServer.listen();

	const page = await browser.newPage({
		viewport: { width: 1024, height: 768 },
	});
	const pageErrors: string[] = [];
	const consoleErrors: string[] = [];
	page.on('pageerror', function onPageError(error) {
		pageErrors.push(String(error));
	});
	page.on('console', function onConsole(message) {
		if (message.type() === 'error') consoleErrors.push(message.text());
	});
	await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
	try {
		suiteResults = await page
			.waitForFunction(
				function readResults() {
					return (
						window as Window & {
							__waypointAdaptedBrowserResults?: Array<{
								fullName: string;
								status: string;
								failedExpectations: unknown[];
							}>;
						}
					).__waypointAdaptedBrowserResults;
				},
				{ timeout: 90_000 },
			)
			.then(async function toValue(handle) {
				const value = await handle.jsonValue();
				if (!value) throw new Error('browser suite returned no results');
				return value;
			});
	} catch (error) {
		const bootState = await page.evaluate(function readBootState() {
			const win = window as Window & {
				__waypointAdaptedBrowserDone?: unknown;
				__waypointAdaptedBrowserResults?: unknown;
				jasmine?: unknown;
			};
			return {
				hasDone: win.__waypointAdaptedBrowserDone != null,
				hasResults: win.__waypointAdaptedBrowserResults != null,
				hasJasmine: win.jasmine != null,
				bodyText: document.body?.innerText?.slice(0, 500) ?? '',
			};
		});
		throw new Error(
			`Adapted browser suite did not finish.\n` +
				`bootState=${JSON.stringify(bootState)}\n` +
				`pageErrors=${pageErrors.join(' | ')}\n` +
				`consoleErrors=${consoleErrors.join(' | ')}\n` +
				`cause=${error instanceof Error ? error.message : String(error)}`,
		);
	}
	await page.close();
	if (pageErrors.length > 0) {
		throw new Error(`Adapted browser page errors:\n${pageErrors.join('\n')}`);
	}
}, 120_000);

afterAll(async function teardownAdaptedBrowser() {
	await browser?.close().catch(function ignore() {});
	await viteServer?.close().catch(function ignore() {});
});

describe('octane waypoint adapted browser suite', function adaptedSuite() {
	it('executes every inventoried upstream identity exactly once', function inventoryGate() {
		const actual = suiteResults
			.map(function nameOf(result) {
				return result.fullName;
			})
			.slice()
			.sort();
		const expected = expectedIdentities.slice().sort();
		expect(actual).toEqual(expected);
	});

	for (const fullName of expectedIdentities) {
		it(fullName, function assertIdentity() {
			const result = suiteResults.find(function match(entry) {
				return entry.fullName === fullName;
			});
			expect(result, `missing identity: ${fullName}`).toBeTruthy();
			expect(result?.status, JSON.stringify(result?.failedExpectations)).toBe('passed');
		});
	}
});
