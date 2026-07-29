import { describe, expect, it } from 'vitest';
import { mount, nextPaint } from '../../../octane/tests/_helpers';
import { SpotlightApp } from '../_fixtures/spotlight.tsrx';

describe('@octanejs/mantine-spotlight', () => {
	it('renders and filters command actions', async () => {
		window.matchMedia = () =>
			({
				matches: false,
				addEventListener() {},
				removeEventListener() {},
			}) as unknown as MediaQueryList;
		globalThis.ResizeObserver = class {
			observe() {}
			unobserve() {}
			disconnect() {}
		} as unknown as typeof ResizeObserver;
		HTMLElement.prototype.scrollIntoView = () => {};

		const result = mount(SpotlightApp, {});
		await nextPaint();
		expect(result.container.textContent).toContain('Dashboard');
		expect(result.container.textContent).toContain('Settings');

		const search = result.container.querySelector('input')!;
		search.value = 'settings';
		search.dispatchEvent(new Event('input', { bubbles: true }));
		await nextPaint();
		expect(result.container.textContent).not.toContain('Dashboard');
		expect(result.container.textContent).toContain('Settings');
		result.unmount();
	});
});
