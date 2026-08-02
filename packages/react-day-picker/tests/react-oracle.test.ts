import React from 'react';
import { act as reactAct } from 'react';
import { createRoot } from 'react-dom/client';
import { DayPicker as ReactDayPicker } from 'react-day-picker';
import { describe, expect, it } from 'vitest';
import { mount } from '../../octane/tests/_helpers.ts';
import { ConstraintsFixture, NavigationFixture } from './_fixtures/calendar.tsrx';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
	true;

function semanticSnapshot(container: HTMLElement) {
	return {
		caption: container.querySelector('[class*="month_caption"]')?.textContent,
		gridRole: container.querySelector('[role="grid"]')?.getAttribute('role'),
		weekdayCount: container.querySelectorAll('[role="columnheader"]').length,
		dayButtonCount: [...container.querySelectorAll('button')].filter((button) =>
			/^\d+$/.test(button.textContent ?? ''),
		).length,
		disabledLabels: [...container.querySelectorAll('button:disabled')].map(
			(button) => button.textContent,
		),
	};
}

describe('react-day-picker v10.0.1 React oracle', () => {
	it('matches the default calendar semantic shape and constraints', async () => {
		const reactContainer = document.createElement('div');
		const root = createRoot(reactContainer);
		await reactAct(() =>
			root.render(
				React.createElement(ReactDayPicker, {
					mode: 'single',
					month: new Date(2026, 7, 1),
					disabled: new Date(2026, 7, 10),
					hidden: new Date(2026, 7, 11),
					showOutsideDays: true,
				}),
			),
		);
		const octane = mount(ConstraintsFixture);
		expect(semanticSnapshot(octane.container)).toEqual(semanticSnapshot(reactContainer));
		octane.unmount();
		await reactAct(() => root.unmount());
	});

	it('matches React month navigation output', async () => {
		const reactContainer = document.createElement('div');
		const root = createRoot(reactContainer);
		await reactAct(() =>
			root.render(
				React.createElement(ReactDayPicker, {
					defaultMonth: new Date(2026, 7, 1),
				}),
			),
		);
		const reactNext = reactContainer.querySelector(
			'button[aria-label*="next"]',
		) as HTMLButtonElement;
		await reactAct(() => reactNext.click());
		const octane = mount(NavigationFixture);
		const octaneNext = octane.container.querySelector(
			'button[aria-label*="next"]',
		) as HTMLButtonElement;
		octaneNext.click();
		expect(semanticSnapshot(octane.container)).toEqual(semanticSnapshot(reactContainer));
		octane.unmount();
		await reactAct(() => root.unmount());
	});
});
