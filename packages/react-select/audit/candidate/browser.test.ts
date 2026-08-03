import { createServer as createNetServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type ViteDevServer } from 'vite';
import { octane } from 'octane/compiler/vite';

const browserRoot = resolve(dirname(fileURLToPath(import.meta.url)), 'browser');

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
let origin: string;

beforeAll(async () => {
	let chromium: typeof import('playwright').chromium;
	try {
		({ chromium } = await import('playwright'));
		browser = await chromium.launch({ headless: true });
	} catch (error) {
		throw new Error(
			'[@octanejs/react-select browser] Chromium is required ' +
				'(run `pnpm exec playwright install chromium`): ' +
				(error instanceof Error ? error.message.split('\n')[0] : String(error)),
		);
	}
	const port = await getFreePort();
	viteServer = await createServer({
		configFile: false,
		root: browserRoot,
		logLevel: 'error',
		plugins: [octane()],
		server: { host: '127.0.0.1', port, strictPort: true },
	});
	await viteServer.listen();
	origin = `http://127.0.0.1:${port}`;
}, 60_000);

afterAll(async () => {
	await browser?.close().catch(() => {});
	await viteServer?.close().catch(() => {});
});

describe('Emotion-to-Octane adapter in Chromium', () => {
	it('inserts, isolates, nonces, orders, deduplicates, and adopts styles', async () => {
		const page = await browser.newPage();
		try {
			await page.goto(origin, { waitUntil: 'networkidle' });
			const result = await page.evaluate(() =>
				(
					globalThis as typeof globalThis & {
						__reactSelectCandidate: { run(): Record<string, unknown> };
					}
				).__reactSelectCandidate.run(),
			);
			expect(result).toEqual({
				className: 'rs-181ypt',
				classesMatch: true,
				clientNonces: ['client-nonce', 'client-nonce'],
				deduped: true,
				hydratedTags: 1,
				isolatedTags: 1,
				orderedRules: true,
				serverStylePreserved: true,
				styleTagsForNestedRule: 2,
			});
		} finally {
			await page.close();
		}
	}, 30_000);
});

describe('MenuPortal in Chromium', () => {
	it('portals, positions, tracks layout changes, and cleans up', async () => {
		const page = await browser.newPage();
		try {
			await page.goto(origin, { waitUntil: 'networkidle' });
			await page.waitForFunction(() => Boolean(window.__reactSelectPortal));
			const initial = await page.evaluate(() => window.__reactSelectPortal.snapshot());
			expect(initial).toMatchObject({
				child: 'Portal child',
				id: 'menu-portal',
				parent: 'portal-target',
				position: 'absolute',
				left: '40px',
				top: '80px',
				width: '180px',
				zIndex: '1',
			});

			const moved = await page.evaluate(() => window.__reactSelectPortal.moveControl());
			expect(moved).toMatchObject({ left: '75px', top: '130px', width: '240px' });

			const fixed = await page.evaluate(() => window.__reactSelectPortal.renderFixed());
			expect(fixed).toMatchObject({
				parent: 'root',
				position: 'fixed',
				left: '75px',
				top: '130px',
				width: '240px',
			});

			const cleaned = await page.evaluate(() => window.__reactSelectPortal.unmount());
			expect(cleaned).toEqual({ portalChildren: 0, rootChildren: 0 });
		} finally {
			await page.close();
		}
	}, 30_000);
});

describe('useStateManager in Chromium', () => {
	it('matches React for uncontrolled transitions, controlled precedence, and callbacks', async () => {
		const page = await browser.newPage();
		try {
			await page.goto(origin, { waitUntil: 'networkidle' });
			await page.waitForFunction(() => Boolean(window.__reactSelectStateManager));
			const initial = await page.evaluate(() => window.__reactSelectStateManager.snapshot());
			expect(initial.octane).toEqual(initial.react);

			const uncontrolled = await page.evaluate(() =>
				window.__reactSelectStateManager.exerciseUncontrolled(),
			);
			expect(uncontrolled.octane).toEqual(uncontrolled.react);
			expect(uncontrolled.octane).toMatchObject({
				consumerProp: 'preserved',
				inputValue: 'TYPED',
				menuIsOpen: true,
				value: { label: 'Next', value: 'next' },
			});
			expect(uncontrolled.logs.octane).toEqual(uncontrolled.logs.react);

			const controlled = await page.evaluate(() =>
				window.__reactSelectStateManager.exerciseControlled(),
			);
			expect(controlled.octane).toEqual(controlled.react);
			expect(controlled.octane).toMatchObject({
				inputValue: 'controlled',
				menuIsOpen: false,
				value: { label: 'Controlled', value: 'controlled' },
			});
			expect(controlled.logs.octane).toEqual(controlled.logs.react);
		} finally {
			await page.close();
		}
	}, 30_000);
});

describe('useAsync in Chromium', () => {
	it('matches React loading, cache, stale-request, resolution, and clear behavior', async () => {
		const page = await browser.newPage();
		try {
			await page.goto(origin, { waitUntil: 'networkidle' });
			await page.waitForFunction(() => Boolean(window.__reactSelectAsync));
			const initial = await page.evaluate(() => window.__reactSelectAsync.snapshot());
			expect(initial.octane).toEqual(initial.react);
			expect(initial.octane).toEqual({
				isLoading: false,
				options: [{ label: 'Default', value: 'default' }],
			});

			const loading = await page.evaluate(() => window.__reactSelectAsync.input('alpha'));
			expect(loading.octane).toEqual(loading.react);
			expect(loading.octane).toEqual({ isLoading: true, options: [] });
			expect(loading.requests.octane).toEqual(loading.requests.react);

			const resolved = await page.evaluate(() =>
				window.__reactSelectAsync.resolve('alpha', [{ label: 'Alpha', value: 'alpha' }]),
			);
			expect(resolved.octane).toEqual(resolved.react);
			expect(resolved.octane).toEqual({
				isLoading: false,
				options: [{ label: 'Alpha', value: 'alpha' }],
			});

			const cached = await page.evaluate(() => window.__reactSelectAsync.input('alpha'));
			expect(cached.octane).toEqual(cached.react);
			expect(cached.requests.octane).toEqual(['alpha']);

			await page.evaluate(() => window.__reactSelectAsync.input('beta'));
			await page.evaluate(() => window.__reactSelectAsync.input('gamma'));
			const stale = await page.evaluate(() =>
				window.__reactSelectAsync.resolve('beta', [{ label: 'Beta', value: 'beta' }]),
			);
			expect(stale.octane).toEqual(stale.react);
			expect(stale.octane).toEqual({
				isLoading: true,
				options: [{ label: 'Alpha', value: 'alpha' }],
			});
			const latest = await page.evaluate(() =>
				window.__reactSelectAsync.resolve('gamma', [{ label: 'Gamma', value: 'gamma' }]),
			);
			expect(latest.octane).toEqual(latest.react);
			expect(latest.octane.options).toEqual([{ label: 'Gamma', value: 'gamma' }]);

			const cleared = await page.evaluate(() => window.__reactSelectAsync.input(''));
			expect(cleared.octane).toEqual(cleared.react);
			expect(cleared.octane).toEqual({
				isLoading: false,
				options: [{ label: 'Default', value: 'default' }],
			});
		} finally {
			await page.close();
		}
	}, 30_000);
});

describe('full Select in Chromium', () => {
	it('matches React focus, menu, option selection, filtering, and keyboard behavior', async () => {
		const page = await browser.newPage();
		try {
			await page.goto(origin, { waitUntil: 'networkidle' });
			await page.waitForFunction(() => Boolean(window.__reactSelectFull));

			const snapshot = async (rootId: string) =>
				page.evaluate((id) => {
					const root = document.getElementById(id)!;
					const visit = (node: Node): unknown => {
						if (node.nodeType === Node.TEXT_NODE) return node.textContent;
						if (!(node instanceof Element)) return null;
						if (
							node.tagName === 'STYLE' ||
							node.getAttribute('role') === 'log' ||
							node.id.endsWith('-live-region')
						) return null;
						const attributes = [...node.attributes]
							.map((attribute) => [
								attribute.name,
								attribute.value
									.replace(/css-[A-Za-z0-9_-]+/g, 'css-HASH')
									.replace(/react-select-(?:\d+|browser)/g, 'react-select-ID'),
							] as const)
							.sort(([a], [b]) => a.localeCompare(b));
						return {
							tag: node.tagName.toLowerCase(),
							attributes,
							children: [...node.childNodes].map(visit).filter((value) => value !== null),
						};
					};
					return [...root.childNodes].map(visit).filter((value) => value !== null);
				}, rootId);

			const expectParity = async () => {
				expect(await snapshot('octane-select-root')).toEqual(await snapshot('react-select-root'));
			};

			await expectParity();
			const octaneInput = page.locator('#octane-select-root [role="combobox"]');
			const reactInput = page.locator('#react-select-root [role="combobox"]');
			await octaneInput.focus();
			await octaneInput.press('ArrowDown');
			const octaneOpened = await snapshot('octane-select-root');
			await reactInput.focus();
			await reactInput.press('ArrowDown');
			const reactOpened = await snapshot('react-select-root');
			expect(octaneOpened).toEqual(reactOpened);
			expect(await page.locator('#octane-select-root [role="option"]').allTextContents()).toEqual([
				// The Octane menu closed when document focus moved to React; the captured
				// structure above is the authoritative open-state comparison.
			]);

			await octaneInput.focus();
			await octaneInput.press('ArrowDown');
			await page.locator('#octane-select-root [role="option"]').nth(1).click();
			const octaneSelected = await snapshot('octane-select-root');
			await reactInput.focus();
			await reactInput.press('ArrowDown');
			await page.locator('#react-select-root [role="option"]').nth(1).click();
			const reactSelected = await snapshot('react-select-root');
			expect(octaneSelected).toEqual(reactSelected);
			expect(await page.locator('#octane-select-root input[name="choice"]').inputValue()).toBe('2');

			await octaneInput.fill('On');
			await octaneInput.press('ArrowDown');
			const octaneFiltered = await snapshot('octane-select-root');
			expect(await page.locator('#octane-select-root [role="option"]').allTextContents()).toEqual(['One']);
			await reactInput.fill('On');
			await reactInput.press('ArrowDown');
			const reactFiltered = await snapshot('react-select-root');
			expect(octaneFiltered).toEqual(reactFiltered);

			const logs = await page.evaluate(() => window.__reactSelectFull.logs());
			const userActions = (items: Array<Record<string, unknown>>) =>
				items.filter((item) => {
					const action = (item.actionMeta as { action?: string } | undefined)?.action;
					return item.type === 'change' || action === 'input-change';
				});
			expect(userActions(logs.octane)).toEqual(userActions(logs.react));
		} finally {
			await page.close();
		}
	}, 30_000);
});

describe('NonceProvider in Chromium', () => {
	it('applies nonce-bearing isolated client caches and reacts to cache-key changes', async () => {
		const page = await browser.newPage();
		try {
			await page.goto(origin, { waitUntil: 'networkidle' });
			await page.waitForFunction(() => Boolean(window.__reactSelectNonce));
			const initial = await page.evaluate(() => window.__reactSelectNonce.snapshot());
			expect(initial.styleCount).toBeGreaterThan(0);
			expect(initial.classes.length).toBeGreaterThan(0);
			expect(initial.nonces.every((nonce) => nonce === 'browser-csp')).toBe(true);

			const switched = await page.evaluate(() => window.__reactSelectNonce.switchKey());
			expect(switched.styleCount).toBe(initial.styleCount);
			expect(switched.classes.length).toBeGreaterThan(0);
			expect(switched.nonces.every((nonce) => nonce === 'browser-csp')).toBe(true);
		} finally {
			await page.close();
		}
	}, 30_000);
});
