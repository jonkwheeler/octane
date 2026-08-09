import React from 'react';
import { act as reactAct } from 'react';
import { createRoot } from 'react-dom/client';
import { Drawer as ReactDrawer } from 'vaul';
import { describe, expect, it } from 'vitest';
import { act, mount } from '../../octane/tests/_helpers.ts';
import { DrawerFixture } from './_fixtures/drawer.tsrx';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
	true;

function semanticSnapshot(content: Element | null) {
	return {
		role: content?.getAttribute('role'),
		direction: content?.getAttribute('data-vaul-drawer-direction'),
		visible: content?.getAttribute('data-vaul-drawer-visible'),
		title: content?.querySelector('[id]')?.textContent,
		text: content?.textContent,
	};
}

describe('vaul v1.1.2 React oracle', () => {
	// Per upstream/test/tests/base.spec.ts:10 (should open drawer).
	// Same open-drawer scenario against published vaul@1.1.2 on React and @octanejs/vaul.
	it('matches React drawer semantics after opening', async () => {
		const reactHost = document.createElement('div');
		document.body.appendChild(reactHost);
		const root = createRoot(reactHost);
		await reactAct(() =>
			root.render(
				React.createElement(
					ReactDrawer.Root,
					{ open: true, onOpenChange: () => {} },
					React.createElement(
						ReactDrawer.Portal,
						null,
						React.createElement(
							ReactDrawer.Content,
							null,
							React.createElement(ReactDrawer.Title, null, 'Account settings'),
							React.createElement(ReactDrawer.Description, null, 'Update your profile.'),
							React.createElement(ReactDrawer.Close, null, 'Close drawer'),
						),
					),
				),
			),
		);
		const reactContent = document.body.querySelector('[data-vaul-drawer]');

		const octane = mount(DrawerFixture);
		await act(() => (octane.container.querySelector('button') as HTMLButtonElement).click());
		const contents = document.body.querySelectorAll('[data-vaul-drawer]');
		const octaneContent = contents[contents.length - 1];
		expect(semanticSnapshot(octaneContent)).toEqual(semanticSnapshot(reactContent));

		octane.unmount();
		await reactAct(() => root.unmount());
		reactHost.remove();
	});
});
