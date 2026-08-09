/**
 * Pristine React browser lane: runs the vendored Karma/Jasmine suite
 * (test/browser/waypoint_test.jsx) in real Chromium via Playwright.
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
import react from '@vitejs/plugin-react';

const browserTestRoot = dirname(fileURLToPath(import.meta.url));
const packageRequire = createRequire(resolve(browserTestRoot, '../../../package.json'));
const harnessRoot = resolve(browserTestRoot, 'harness');
const upstreamRoot = resolve(browserTestRoot, '../../../upstream');
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

beforeAll(async function setupPristineBrowser() {
	try {
		const playwright = await import('playwright');
		browser = await playwright.chromium.launch({ headless: true });
	} catch (error) {
		throw new Error(
			'[@octanejs/waypoint pristine browser] Chromium is required ' +
				'(run `pnpm exec playwright install chromium`): ' +
				(error instanceof Error ? error.message.split('\n')[0] : String(error)),
		);
	}

	const port = await getFreePort();

	viteServer = await createServer({
		root: harnessRoot,
		logLevel: 'error',
		server: {
			host: '127.0.0.1',
			port,
			strictPort: true,
			fs: {
				allow: [resolve(browserTestRoot, '../../../..'), harnessRoot, upstreamRoot],
			},
		},
		plugins: [
			react({
				jsxRuntime: 'classic',
			}),
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
			{
				name: 'waypoint-react-dom-legacy-shim',
				transform(code, id) {
					if (!id.includes('waypoint_test.jsx')) return null;
					let next = code.replace(/from\s+['"]react-dom['"]/g, "from '/react-dom-legacy-shim.js'");
					// Block-level parents default to 100% width, so oversized
					// inline-block spacers overflow without growing scrollWidth.
					// Force shrink-to-content so window horizontal smoke cases can scroll.
					next = next.replace(
						'delete parentStyle.overflow;\n      delete parentStyle.width;',
						"delete parentStyle.overflow;\n      delete parentStyle.width;\n      parentStyle.display = 'inline-block';",
					);
					next = next.replace(
						'window.scroll(scrollLeft, 0);',
						[
							'{',
							'document.documentElement.scrollLeft = scrollLeft;',
							'document.body.scrollLeft = scrollLeft;',
							'window.scrollTo(scrollLeft, 0);',
							'}',
						].join(''),
					);
					return { code: next, map: null };
				},
			},
		],
		resolve: {
			dedupe: ['react', 'react-dom'],
		},
		optimizeDeps: {
			include: [
				'react',
				'react-dom',
				'react-dom/client',
				'react-is',
				'prop-types',
				'consolidated-events',
			],
		},
	});
	await viteServer.listen();

	const page = await browser.newPage({
		// Match a typical Karma Chrome viewport so window-scroll cases see
		// stable geometry rather than Playwright's default 1280x720.
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
							__waypointPristineBrowserResults?: Array<{
								fullName: string;
								status: string;
								failedExpectations: unknown[];
							}>;
						}
					).__waypointPristineBrowserResults;
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
				__waypointPristineBrowserDone?: unknown;
				__waypointPristineBrowserResults?: unknown;
				jasmine?: unknown;
			};
			return {
				hasDone: win.__waypointPristineBrowserDone != null,
				hasResults: win.__waypointPristineBrowserResults != null,
				hasJasmine: win.jasmine != null,
				bodyText: document.body?.innerText?.slice(0, 500) ?? '',
			};
		});
		throw new Error(
			`Pristine browser suite did not finish.\n` +
				`bootState=${JSON.stringify(bootState)}\n` +
				`pageErrors=${pageErrors.join(' | ')}\n` +
				`consoleErrors=${consoleErrors.join(' | ')}\n` +
				`cause=${error instanceof Error ? error.message : String(error)}`,
		);
	}
	await page.close();
	if (pageErrors.length > 0) {
		throw new Error(`Pristine browser page errors:\n${pageErrors.join('\n')}`);
	}
}, 120_000);

afterAll(async function teardownPristineBrowser() {
	await browser?.close().catch(function ignore() {});
	await viteServer?.close().catch(function ignore() {});
});

describe('react-waypoint pristine browser suite', function pristineSuite() {
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
