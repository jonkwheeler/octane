import { describe, expect, it } from 'vitest';
import { mount } from '../../../octane/tests/_helpers';
import { ScheduleApp } from '../_fixtures/schedule.tsrx';

describe('@octanejs/mantine-schedule', () => {
	it('renders a month schedule with events', () => {
		window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) as any;
		globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as any;
		const result = mount(ScheduleApp, {});
		expect(result.container.textContent).toContain('July 2026');
		expect(result.container.textContent).toContain('Planning session');
		result.unmount();
	});
});
