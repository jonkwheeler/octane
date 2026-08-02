import { drainPassiveEffects, flushSync, hydrateRoot } from 'octane';
import { describe, expect, it, vi } from 'vitest';
import { flushEffects } from '../../../octane/tests/_helpers';
import { renderHydrationFixture } from '../../../octane/tests/_hydration-ssr';
import { PersistenceHydrationFixture } from '../_fixtures/persistence-hydration.tsrx';

async function settle(): Promise<void> {
	for (let index = 0; index < 4; index++) {
		await new Promise((resolve) => setTimeout(resolve, 0));
		drainPassiveEffects();
		flushEffects();
		flushSync(() => {});
	}
}

describe('react-resizable-panels persistence hydration', () => {
	it('adopts server markup, restores storage, and saves through live events', async () => {
		const serverResult = await renderHydrationFixture(
			'react-resizable-panels',
			'packages/react-resizable-panels/tests/_fixtures/persistence-hydration.tsrx',
			'PersistenceHydrationFixture',
		);
		const values = new Map([['react-resizable-panels:hydrated', '{"left":40,"right":60}']]);
		const storage = {
			getItem: vi.fn((key: string) => values.get(key) ?? null),
			setItem: vi.fn((key: string, value: string) => values.set(key, value)),
		};
		const container = document.createElement('div');
		container.innerHTML = serverResult.html;
		document.body.appendChild(container);
		const serverButton = container.querySelector('button');
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});

		const root = hydrateRoot(container, PersistenceHydrationFixture, { storage });
		await settle();

		expect(error).not.toHaveBeenCalled();
		expect(storage.getItem).toHaveBeenCalledWith('react-resizable-panels:hydrated');
		expect(container.querySelector('button')).toBe(serverButton);
		expect(serverButton?.getAttribute('data-layout')).toBe('{"left":40,"right":60}');
		serverButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		await settle();
		expect(storage.setItem).toHaveBeenCalledWith(
			'react-resizable-panels:hydrated',
			'{"left":30,"right":70}',
		);

		root.unmount();
		error.mockRestore();
		container.remove();
	});
});
