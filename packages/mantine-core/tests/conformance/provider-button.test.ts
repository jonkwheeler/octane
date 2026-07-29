import { describe, expect, it } from 'vitest';
import { ProviderButton } from '../_fixtures/provider-button.tsrx';
import { mount } from '../_helpers';

describe('@octanejs/mantine-core', () => {
	it('renders themed interactive components through Octane', () => {
		window.matchMedia = () =>
			({
				matches: false,
				addEventListener() {},
				removeEventListener() {},
			}) as unknown as MediaQueryList;
		const result = mount(ProviderButton, {});
		const button = result.find('#increment');

		expect(button.textContent).toBe('Count 0');
		expect(button.className).toContain('mantine-Button-root');
		expect(result.find('#formatted').textContent).toBe('12,345.6');
		expect(document.querySelector('#modal-content')?.textContent).toBe('Modal body');
		expect(document.querySelector('[role="tooltip"]')?.textContent).toContain('Native tooltip');
		expect(document.body.style.overflow).toBe('hidden');

		result.click('#increment');
		expect(button.textContent).toBe('Count 1');
		result.unmount();
		expect(document.body.style.overflow).toBe('');
	});
});
