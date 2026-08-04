import { afterEach, describe, expect, it } from 'vitest';
import { createRoot, flushSync } from 'octane';
import { setNonce } from '@octanejs/react-colorful';
import { HexHarness } from './_fixtures/RuntimeHarness.tsrx';

const cleanups: Array<() => void> = [];

afterEach(() => {
	for (const cleanup of cleanups.splice(0)) cleanup();
});

function mountIn(container: Element | DocumentFragment) {
	const root = createRoot(container as Element);
	root.render(HexHarness, {});
	flushSync(() => {});
	cleanups.push(() => root.unmount());
	return root;
}

describe('@octanejs/react-colorful — automatic stylesheet', () => {
	it('injects one stylesheet into the closest ShadowRoot and applies a CSP nonce', () => {
		setNonce('colorful-nonce');
		const host = document.createElement('div');
		document.body.appendChild(host);
		const shadow = host.attachShadow({ mode: 'open' });
		const first = document.createElement('div');
		const second = document.createElement('div');
		shadow.append(first, second);
		mountIn(first);
		mountIn(second);

		const styles = shadow.querySelectorAll('style');
		expect(styles).toHaveLength(1);
		expect(styles[0].getAttribute('nonce')).toBe('colorful-nonce');
		expect(styles[0].textContent).toContain('.react-colorful__saturation');
		expect(document.head.querySelector('style[nonce="colorful-nonce"]')).toBeNull();
		cleanups.push(() => host.remove());
	});

	it('uses an iframe-like owner document instead of the ambient document', () => {
		const frameDocument = document.implementation.createHTMLDocument('frame');
		const container = frameDocument.createElement('div');
		frameDocument.body.appendChild(container);
		mountIn(container);

		expect(frameDocument.head.querySelectorAll('style')).toHaveLength(1);
		expect(frameDocument.head.querySelector('style')?.textContent).toContain('.react-colorful');
		expect(container.querySelector('.react-colorful')).not.toBeNull();
	});
});
