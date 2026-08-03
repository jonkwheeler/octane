import { drainPassiveEffects, flushSync, hydrateRoot } from 'octane';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHydrationFixture } from '../../octane/tests/_hydration-ssr';
import { ReactWindowServerFixture } from './ssr/_fixtures/server';
import { mockResizeObserver, setElementSizeFunction } from './utils/mockResizeObserver';

let restoreResizeObserver: (() => void) | undefined;

beforeEach(() => {
	restoreResizeObserver = mockResizeObserver();
	setElementSizeFunction((element) =>
		element.getAttribute('data-testid') === 'server-grid'
			? new DOMRect(0, 0, 40, 40)
			: new DOMRect(0, 0, 200, 100),
	);
});

afterEach(() => restoreResizeObserver?.());

describe('@octanejs/react-window hydration', () => {
	// @parity-case adapted:react-window-hydration
	it('adopts server List and Grid nodes and keeps virtualization live', async () => {
		const server = await renderHydrationFixture(
			'react-window',
			'packages/react-window/tests/ssr/_fixtures/server.tsx',
			'ReactWindowServerFixture',
		);
		const container = document.createElement('div');
		container.innerHTML = server.html;
		document.body.appendChild(container);
		const serverMain = container.querySelector('#react-window-server');
		const serverList = container.querySelector<HTMLElement>('[data-testid="server-list"]');
		const serverGrid = container.querySelector<HTMLElement>('[data-testid="server-grid"]');
		const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
		let root: ReturnType<typeof hydrateRoot> | undefined;

		try {
			root = hydrateRoot(container, ReactWindowServerFixture);
			flushSync(() => {});
			drainPassiveEffects();

			expect(container.querySelector('#react-window-server')).toBe(serverMain);
			expect(container.querySelector('[data-testid="server-list"]')).toBe(serverList);
			expect(container.querySelector('[data-testid="server-grid"]')).toBe(serverGrid);
			expect(errors).not.toHaveBeenCalled();

			serverList!.scrollTop = 400;
			serverList!.dispatchEvent(new Event('scroll', { bubbles: true }));
			serverGrid!.scrollLeft = 200;
			serverGrid!.scrollTop = 200;
			serverGrid!.dispatchEvent(new Event('scroll', { bubbles: true }));
			flushSync(() => {});

			expect(serverList?.querySelector('[data-row="20"]')).not.toBeNull();
			expect(serverGrid?.querySelector('[data-cell="10:10"]')).not.toBeNull();
			expect(errors).not.toHaveBeenCalled();
		} finally {
			root?.unmount();
			errors.mockRestore();
			container.remove();
		}
	});
});
