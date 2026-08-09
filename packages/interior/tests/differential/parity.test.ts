/**
 * The same fixture runs through @octanejs/interior and the pinned upstream
 * React copy-paste source (ddoemonn/interior@47a4d2d7…). Idle and copied states
 * are compared after normalizing known @octanejs/motion vs motion/react SVG
 * emission differences (pathLength dash arrays; viewBox casing).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { act } from 'react';
import { mountDifferential, normaliseHtml } from '../../../octane/tests/differential/_rig.js';

const FIXTURE = resolve(__dirname, './_fixtures/copy-button-diff.tsrx');
const CACHE = resolve(__dirname, '.react-cache');

async function settle(): Promise<void> {
	await act(async function wait() {
		await new Promise(function delay(resolvePromise) {
			setTimeout(resolvePromise, 20);
		});
	});
}

/**
 * OCTANE DIVERGENCE (motion SVG emission): upstream motion/react stamps
 * pathLength/stroke-dash* on the check path even at pathLength 0, and keeps
 * camelCase viewBox. @octanejs/motion omits the idle dash attrs and lowercases
 * the SVG attribute. Strip only those tokens so the rest of the CopyButton
 * markup still has to match byte-for-byte.
 */
function stripMotionSvgNoise(html: string): string {
	return html
		.replace(/ pathLength="[^"]*"/g, '')
		.replace(/ stroke-dasharray="[^"]*"/g, '')
		.replace(/ stroke-dashoffset="[^"]*"/g, '')
		.replace(/ viewBox=/g, ' viewbox=');
}

function expectEqualCopyButtonMarkup(
	octane: { container: HTMLElement },
	react: { container: HTMLElement },
): void {
	expect(normaliseHtml(stripMotionSvgNoise(octane.container.innerHTML))).toBe(
		normaliseHtml(stripMotionSvgNoise(react.container.innerHTML)),
	);
}

beforeAll(function stubClipboardAndMotion() {
	const globals = globalThis as unknown as {
		matchMedia?: (query: string) => MediaQueryList;
		navigator: Navigator;
		__interiorHadMatchMedia?: boolean;
		__interiorPrevMatchMedia?: typeof matchMedia;
		__interiorPrevClipboard?: Clipboard | undefined;
	};

	globals.__interiorHadMatchMedia = typeof globals.matchMedia === 'function';
	globals.__interiorPrevMatchMedia = globals.matchMedia;
	globals.matchMedia = function matchMedia(query: string): MediaQueryList {
		return {
			matches: query.includes('prefers-reduced-motion'),
			media: query,
			onchange: null,
			addListener: function noop() {},
			removeListener: function noop() {},
			addEventListener: function noop() {},
			removeEventListener: function noop() {},
			dispatchEvent: function dispatch() {
				return false;
			},
		} as MediaQueryList;
	};

	globals.__interiorPrevClipboard = globals.navigator.clipboard;
	Object.defineProperty(globals.navigator, 'clipboard', {
		configurable: true,
		value: {
			writeText: async function writeText() {
				return undefined;
			},
		},
	});
});

afterAll(function restoreClipboardAndMotion() {
	const globals = globalThis as unknown as {
		matchMedia?: (query: string) => MediaQueryList;
		navigator: Navigator;
		__interiorHadMatchMedia?: boolean;
		__interiorPrevMatchMedia?: typeof matchMedia;
		__interiorPrevClipboard?: Clipboard | undefined;
	};

	if (globals.__interiorHadMatchMedia) {
		globals.matchMedia = globals.__interiorPrevMatchMedia;
	} else {
		delete globals.matchMedia;
	}
	Object.defineProperty(globals.navigator, 'clipboard', {
		configurable: true,
		value: globals.__interiorPrevClipboard,
	});
});

describe('differential: @octanejs/interior vs ddoemonn/interior CopyButton', function suite() {
	// @parity-case differential:copy-button
	it('matches idle mount and copied-state markup', async function testCopyButton() {
		const differential = await mountDifferential(FIXTURE, 'CopyButtonDiff', undefined, CACHE);

		await differential.observe('idle mount', async function idle(octane, react) {
			await settle();
			expectEqualCopyButtonMarkup(octane, react);
			expect(octane.find('button').getAttribute('aria-label')).toBe('Copy');
			expect(react.find('button').getAttribute('aria-label')).toBe('Copy');
		});

		await differential.observe('copy click reaches copied state', async function copy(octane, react) {
			await octane.click('button');
			await react.click('button');
			await settle();
			await settle();
			expectEqualCopyButtonMarkup(octane, react);
			expect(octane.container.textContent).toContain('Copied');
			expect(react.container.textContent).toContain('Copied');
		});

		differential.unmount();
	});
});
