import { drainPassiveEffects, flushSync, hydrateRoot } from 'octane';
import { describe, expect, it, vi } from 'vitest';

import { flushEffects } from '../../../octane/tests/_helpers';
import { renderHydrationFixture } from '../../../octane/tests/_hydration-ssr';
import { HydrationInput } from './_fixture.tsrx';

function settle(): void {
	drainPassiveEffects();
	flushEffects();
	flushSync(() => {});
}

describe('@octanejs/input-otp hydration and cleanup', () => {
	it('adopts the server input and remains editable', async () => {
		const server = await renderHydrationFixture(
			'input-otp',
			'packages/input-otp/tests/hydration/_fixture.tsrx',
			'HydrationInput',
		);
		const container = document.createElement('div');
		container.innerHTML = server.html;
		document.body.appendChild(container);
		const serverInput = container.querySelector('input') as HTMLInputElement;
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const root = hydrateRoot(container, HydrationInput);
		settle();
		const hydratedInput = container.querySelector('input') as HTMLInputElement;
		expect(hydratedInput).toBe(serverInput);
		expect(error).not.toHaveBeenCalled();
		hydratedInput.value = '123';
		hydratedInput.dispatchEvent(new Event('input', { bubbles: true }));
		settle();
		expect(hydratedInput.value).toBe('123');
		expect(container.querySelector('[data-testid="hydrated-value"]')?.textContent).toBe('123');
		root.unmount();
		error.mockRestore();
		container.remove();
	});

	it('removes selection listeners, disconnects observers, and clears timers on unmount', async () => {
		vi.useFakeTimers();
		const originalAdd = document.addEventListener.bind(document);
		const originalRemove = document.removeEventListener.bind(document);
		let selectionAdds = 0;
		let selectionRemoves = 0;
		vi.spyOn(document, 'addEventListener').mockImplementation((type, listener, options) => {
			if (type === 'selectionchange') selectionAdds++;
			originalAdd(type, listener, options);
		});
		vi.spyOn(document, 'removeEventListener').mockImplementation((type, listener, options) => {
			if (type === 'selectionchange') selectionRemoves++;
			originalRemove(type, listener, options);
		});
		const disconnect = vi.fn();
		const OriginalResizeObserver = globalThis.ResizeObserver;
		globalThis.ResizeObserver = class {
			observe() {}
			unobserve() {}
			disconnect = disconnect;
		} as unknown as typeof ResizeObserver;

		const server = await renderHydrationFixture(
			'input-otp',
			'packages/input-otp/tests/hydration/_fixture.tsrx',
			'HydrationInput',
		);
		const container = document.createElement('div');
		container.innerHTML = server.html;
		document.body.appendChild(container);
		const root = hydrateRoot(container, HydrationInput);
		settle();
		expect(selectionAdds).toBe(1);
		expect(vi.getTimerCount()).toBeGreaterThan(0);
		root.unmount();
		expect(selectionRemoves).toBe(1);
		expect(disconnect).toHaveBeenCalledTimes(1);
		expect(vi.getTimerCount()).toBe(0);
		expect(document.getElementById('input-otp-style')).toBeNull();

		vi.restoreAllMocks();
		globalThis.ResizeObserver = OriginalResizeObserver;
		vi.useRealTimers();
		container.remove();
	});
});
