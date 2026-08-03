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
