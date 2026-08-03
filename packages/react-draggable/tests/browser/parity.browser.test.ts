import { createServer as createNetServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type ViteDevServer } from 'vite';
import { octane } from '../../../octane/src/compiler/vite.js';

const directory = dirname(fileURLToPath(import.meta.url));
const harnessRoot = resolve(directory, 'harness');
const packageSrc = resolve(directory, '../../src/index.tsrx');
const octaneSrc = resolve(directory, '../../../octane/src/index.ts');

function freePort(): Promise<number> {
	return new Promise((resolvePort, reject) => {
		const server = createNetServer();
		server.once('error', reject);
		server.listen(0, '127.0.0.1', () => {
			const { port } = server.address() as import('node:net').AddressInfo;
			server.close(() => resolvePort(port));
		});
	});
}

let server: ViteDevServer;
let origin: string;
let playwright: typeof import('playwright');

beforeAll(async () => {
	playwright = await import('playwright');
	const port = await freePort();
	server = await createServer({
		root: harnessRoot,
		logLevel: 'error',
		server: { host: '127.0.0.1', port, strictPort: true },
		plugins: [octane()],
		resolve: {
			alias: [
				{ find: /^@octanejs\/react-draggable$/, replacement: packageSrc },
				{ find: /^octane$/, replacement: octaneSrc },
			],
		},
	});
	await server.listen();
	origin = `http://127.0.0.1:${port}`;
}, 60_000);

afterAll(async () => server?.close());

// Browser-platform cases adapted from the pinned test/Draggable.test.jsx and
// test/DraggableCore.test.jsx suites. The same journey is declared for both
// required engines; missing browser binaries fail instead of silently skipping.
async function runNativeJourney(engine: 'chromium' | 'firefox') {
	const browser = await playwright[engine].launch({ headless: true });
	const page = await browser.newPage();
	try {
		await page.goto(origin, { waitUntil: 'networkidle' });
		const drag = page.locator('#mouse-drag');
		const before = await drag.boundingBox();
		expect(before).not.toBeNull();
		await page.locator('#focus-input').focus();
		expect(
			await page.locator('#focus-input').evaluate((node) => node === document.activeElement),
		).toBe(true);
		const bounds = await page.locator('#bounds').boundingBox();
		expect(bounds).not.toBeNull();
		await page.mouse.move(before!.x + before!.width / 2, before!.y + before!.height / 2);
		await page.mouse.down();
		await page.mouse.move(bounds!.x + bounds!.width - 1, bounds!.y + bounds!.height - 1);
		await page.mouse.up();
		await expect.poll(() => drag.getAttribute('style')).toContain('translate(110px, 100px)');
		expect(await page.locator('#trace').textContent()).toBe('stop:110,100');
		expect(await page.locator('#svg-drag').getAttribute('transform')).toBe('translate(2,3)');
		expect(await page.locator('#svg-drag').getAttribute('style')).toBe('');

		const touchResult = await page.locator('#touch-drag').evaluate((node) => {
			if (typeof TouchEvent === 'undefined' || typeof Touch === 'undefined') {
				return { supported: false as const };
			}
			const start = new TouchEvent('touchstart', {
				bubbles: true,
				cancelable: true,
				touches: [new Touch({ identifier: 7, target: node, clientX: 1, clientY: 1 })],
				targetTouches: [new Touch({ identifier: 7, target: node, clientX: 1, clientY: 1 })],
			});
			node.dispatchEvent(start);
			const move = new TouchEvent('touchmove', {
				bubbles: true,
				cancelable: true,
				touches: [new Touch({ identifier: 7, target: node, clientX: 11, clientY: 16 })],
				targetTouches: [new Touch({ identifier: 7, target: node, clientX: 11, clientY: 16 })],
			});
			document.dispatchEvent(move);
			document.dispatchEvent(
				new TouchEvent('touchend', {
					bubbles: true,
					cancelable: true,
					changedTouches: [new Touch({ identifier: 7, target: node, clientX: 11, clientY: 16 })],
				}),
			);
			return {
				supported: true as const,
				startPrevented: start.defaultPrevented,
				movePrevented: move.defaultPrevented,
			};
		});
		if (touchResult.supported) {
			expect(touchResult).toEqual({
				supported: true,
				startPrevented: true,
				movePrevented: false,
			});
			expect(await page.locator('#trace').textContent()).toBe('touch:10,15');
			expect(
				await page
					.locator('#touch-drag')
					.evaluate((node) => node.classList.contains('react-draggable-dragging')),
			).toBe(false);
		} else {
			expect(engine).toBe('firefox');
		}
	} finally {
		await page.close();
		await browser.close();
	}
}

async function runOwnershipJourney(engine: 'chromium' | 'firefox') {
	const browser = await playwright[engine].launch({ headless: true });
	const page = await browser.newPage();
	try {
		await page.goto(origin, { waitUntil: 'networkidle' });

		await page.evaluate(async () => {
			const node = document
				.querySelector('#shadow-host')!
				.shadowRoot!.querySelector('#shadow-drag')!;
			node.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 5, clientY: 5 }));
			document.body.dispatchEvent(
				new MouseEvent('mousemove', { bubbles: true, clientX: 500, clientY: 500 }),
			);
			document.body.dispatchEvent(
				new MouseEvent('mouseup', { bubbles: true, clientX: 500, clientY: 500 }),
			);
			await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
		});
		await page.waitForTimeout(50);
		const shadow = await page.evaluate(() => {
			const root = document.querySelector('#shadow-host')!.shadowRoot!;
			const node = root.querySelector('#shadow-drag')!;
			return {
				trace: root.querySelector('#shadow-trace')?.textContent,
				style: (node as HTMLElement).style.transform,
				clean: !document.body.classList.contains('react-draggable-transparent-selection'),
			};
		});
		expect(shadow.trace).toMatch(/^stop:/);
		expect(shadow.style).toBe('translate(100px, 80px)');
		expect(shadow.clean).toBe(true);

		const frame = page.frameLocator('#owner-frame');
		const frameDrag = frame.locator('#frame-drag');
		const frameBox = await frameDrag.boundingBox();
		expect(frameBox).not.toBeNull();
		await page.mouse.move(frameBox!.x + 2, frameBox!.y + 2);
		await page.mouse.down();
		await page.mouse.move(frameBox!.x + 17, frameBox!.y + 21);
		await page.mouse.up();
		await page.waitForTimeout(50);
		const frameResult = await frameDrag.evaluate((node) => {
			const owner = node.ownerDocument;
			return {
				trace: owner.querySelector('#frame-trace')?.textContent,
				style: (node as HTMLElement).style.transform,
				frameClean: !owner.body.classList.contains('react-draggable-transparent-selection'),
				topUntouched: !window.top!.document.body.classList.contains(
					'react-draggable-transparent-selection',
				),
			};
		});
		expect(frameResult).toEqual({
			trace: 'stop:15,19',
			style: 'translate(15px, 19px)',
			frameClean: true,
			topUntouched: true,
		});

		const unmounts = await page.evaluate(async () => {
			const callback = document.querySelector('#callback-unmount-drag')!;
			callback.dispatchEvent(
				new MouseEvent('mousedown', { bubbles: true, clientX: 1, clientY: 1 }),
			);
			document.dispatchEvent(
				new MouseEvent('mousemove', { bubbles: true, clientX: 4, clientY: 5 }),
			);
			const callbackRemoved = !document.querySelector('#callback-unmount-drag');
			const callbackClean = !document.body.classList.contains(
				'react-draggable-transparent-selection',
			);
			const active = document.querySelector('#active-unmount-drag')!;
			active.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 1, clientY: 1 }));
			const activeDirty = document.body.classList.contains('react-draggable-transparent-selection');
			(
				globalThis as unknown as { __reactDraggableU5: { unmountActive(): void } }
			).__reactDraggableU5.unmountActive();
			await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
			return {
				callbackRemoved,
				callbackClean,
				activeDirty,
				activeRemoved: !document.querySelector('#active-unmount-drag'),
				activeClean: !document.body.classList.contains('react-draggable-transparent-selection'),
			};
		});
		// The pinned callback-driven unmount path throws while the move handler
		// attempts its forced stop and retains the user-select resource. A later
		// ordinary active unmount is the terminal cleanup path.
		expect(unmounts).toEqual({
			callbackRemoved: true,
			callbackClean: false,
			activeDirty: true,
			activeRemoved: true,
			activeClean: true,
		});

		const errors = await page.evaluate(async () => {
			const messages: string[] = [];
			window.addEventListener('error', (event) => {
				messages.push(event.error?.message ?? event.message);
				event.preventDefault();
			});
			for (const id of ['callback-error-drag', 'selector-error-drag']) {
				const node = document.querySelector(`#${id}`)!;
				node.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 1, clientY: 1 }));
				document.dispatchEvent(
					new MouseEvent('mousemove', { bubbles: true, clientX: 3, clientY: 4 }),
				);
				if (!document.body.classList.contains('react-draggable-transparent-selection'))
					throw new Error(`${id}: resources were not retained`);
				document.dispatchEvent(
					new MouseEvent('mouseup', { bubbles: true, clientX: 3, clientY: 4 }),
				);
				await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
				if (document.body.classList.contains('react-draggable-transparent-selection'))
					throw new Error(`${id}: later stop did not clean`);
			}
			return messages;
		});
		expect(errors).toContain('pinned-active-callback');
		expect(errors.some((message) => message.includes('.missing-bound'))).toBe(true);

		const mixed = await page.locator('#mixed-drag').evaluate(async (node) => {
			const api = (globalThis as unknown as { __reactDraggableU5: { mixedTrace: string[] } })
				.__reactDraggableU5;
			node.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 1, clientY: 1 }));
			const touchSupported = typeof TouchEvent !== 'undefined' && typeof Touch !== 'undefined';
			if (touchSupported) {
				node.dispatchEvent(
					new TouchEvent('touchstart', {
						bubbles: true,
						cancelable: true,
						touches: [new Touch({ identifier: 9, target: node, clientX: 2, clientY: 2 })],
						targetTouches: [new Touch({ identifier: 9, target: node, clientX: 2, clientY: 2 })],
					}),
				);
			}
			document.dispatchEvent(
				new MouseEvent('mousemove', { bubbles: true, clientX: 5, clientY: 6 }),
			);
			document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 5, clientY: 6 }));
			if (touchSupported)
				document.dispatchEvent(
					new TouchEvent('touchend', {
						bubbles: true,
						cancelable: true,
						changedTouches: [new Touch({ identifier: 9, target: node, clientX: 5, clientY: 6 })],
					}),
				);
			await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
			return {
				touchSupported,
				trace: [...api.mixedTrace],
				clean: !document.body.classList.contains('react-draggable-transparent-selection'),
			};
		});
		if (mixed.touchSupported)
			expect(mixed.trace.slice(0, 2)).toEqual(['start:mousedown', 'start:touchstart']);
		else expect(engine).toBe('firefox');
		expect(mixed.trace).toContain(mixed.touchSupported ? 'stop:touchend' : 'stop:mouseup');
		expect(mixed.clean).toBe(true);
	} finally {
		await page.close();
		await browser.close();
	}
}

describe('Chromium native parity', () => {
	// @parity-case browser:react-draggable-chromium-native
	it(
		'proves real geometry, parent bounds, grid, focus, SVG, touch prevention, and teardown',
		() => runNativeJourney('chromium'),
		60_000,
	);
	// @parity-case browser:react-draggable-chromium-ownership-cleanup
	it(
		'proves owner-document, shadow selector, unmount, error retention, and overlapping-input dispositions',
		() => runOwnershipJourney('chromium'),
		60_000,
	);
});

describe('Firefox native parity', () => {
	// @parity-case browser:react-draggable-firefox-native
	it(
		'proves real geometry, parent bounds, grid, focus, SVG, touch prevention, and teardown',
		() => runNativeJourney('firefox'),
		60_000,
	);
	// @parity-case browser:react-draggable-firefox-ownership-cleanup
	it(
		'proves owner-document, shadow selector, unmount, error retention, and overlapping-input dispositions',
		() => runOwnershipJourney('firefox'),
		60_000,
	);
});
