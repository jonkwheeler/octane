import { describe, expect, it } from 'vitest';
import { act, mount } from '../../octane/tests/_helpers.ts';
import { DrawerFixture } from './_fixtures/drawer.tsrx';

describe('vaul v1.1.2 adapted drawer behavior', () => {
	// @parity-case runtime:controlled-open-close
	// Per upstream/test/tests/base.spec.ts:10 (should open drawer).
	// Per upstream/test/tests/base.spec.ts:27 (should close when `Drawer.Close` is clicked).
	// Per upstream/test/tests/base.spec.ts:35 (should close when controlled).
	it('opens and closes through the public trigger and close controls', async () => {
		const view = mount(DrawerFixture);
		expect(view.container.querySelector('#drawer-state')?.textContent).toBe('closed');

		await act(() => (view.container.querySelector('button') as HTMLButtonElement).click());
		expect(view.container.querySelector('#drawer-state')?.textContent).toBe('open');
		const content = document.body.querySelector('[data-vaul-drawer]');
		expect(content).not.toBeNull();
		expect(content?.getAttribute('data-vaul-drawer-direction')).toBe('bottom');
		expect(content?.textContent).toContain('Account settings');

		await act(() =>
			(document.body.querySelector('[data-vaul-drawer] button') as HTMLButtonElement).click(),
		);
		expect(view.container.querySelector('#drawer-state')?.textContent).toBe('closed');
		view.unmount();
	});
});
