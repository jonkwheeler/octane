import { describe, expect, it } from 'vitest';
import { mount } from '../../../octane/tests/_helpers';
import { DatesApp } from '../_fixtures/dates.tsrx';

describe('@octanejs/mantine-dates', () => {
	it('renders a selected calendar date', () => {
		const result = mount(DatesApp, {});
		expect(result.container.textContent).toContain('July 2026');
		expect(result.container.querySelector('[data-selected]')?.textContent).toBe('29');
		result.unmount();
	});
});
