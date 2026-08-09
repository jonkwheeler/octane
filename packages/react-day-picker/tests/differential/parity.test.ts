import React from 'react';
import { act as reactAct } from 'react';
import { createRoot } from 'react-dom/client';
import { DayPicker as ReactDayPicker } from 'react-day-picker';
import { describe, expect, it } from 'vitest';
import { mount } from '../../../octane/tests/_helpers.ts';
import { ConstraintsFixture, NavigationFixture } from '../_fixtures/calendar.tsrx';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
	true;

function isDayButton(button: Element): boolean {
	return /^\d+$/.test(button.textContent ?? '');
}

function semanticSnapshot(container: HTMLElement) {
	return {
		caption: container.querySelector('[class*="month_caption"]')?.textContent,
		gridRole: container.querySelector('[role="grid"]')?.getAttribute('role'),
		weekdayCount: container.querySelectorAll('[role="columnheader"]').length,
		dayButtonCount: [...container.querySelectorAll('button')].filter(isDayButton).length,
		disabledLabels: [...container.querySelectorAll('button:disabled')].map(function (button) {
			return button.textContent;
		}),
	};
}

describe('differential: @octanejs/react-day-picker vs react-day-picker 10.0.1', () => {
	it('matches the default calendar semantic shape and constraints', async () => {
		const reactContainer = document.createElement('div');
		const root = createRoot(reactContainer);
		await reactAct(function () {
			root.render(
				React.createElement(ReactDayPicker, {
					mode: 'single',
					month: new Date(2026, 7, 1),
					disabled: new Date(2026, 7, 10),
					hidden: new Date(2026, 7, 11),
					showOutsideDays: true,
				}),
			);
		});
		const octane = mount(ConstraintsFixture);
		expect(semanticSnapshot(octane.container)).toEqual(semanticSnapshot(reactContainer));
		octane.unmount();
		await reactAct(function () {
			root.unmount();
		});
	});

	it('matches React month navigation output', async () => {
		const reactContainer = document.createElement('div');
		const root = createRoot(reactContainer);
		await reactAct(function () {
			root.render(
				React.createElement(ReactDayPicker, {
					defaultMonth: new Date(2026, 7, 1),
				}),
			);
		});
		const reactNext = reactContainer.querySelector(
			'button[aria-label*="next"]',
		) as HTMLButtonElement;
		await reactAct(function () {
			reactNext.click();
		});
		const octane = mount(NavigationFixture);
		const octaneNext = octane.container.querySelector(
			'button[aria-label*="next"]',
		) as HTMLButtonElement;
		octaneNext.click();
		expect(semanticSnapshot(octane.container)).toEqual(semanticSnapshot(reactContainer));
		octane.unmount();
		await reactAct(function () {
			root.unmount();
		});
	});
});
