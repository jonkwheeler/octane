import { describe, expect, it } from 'vitest';
import { mount } from '../_helpers';
import { StateHooks } from '../_fixtures/state-hooks.tsrx';

describe('@octanejs/mantine-hooks state hooks', () => {
	it('preserves Mantine state hook behavior through Octane renders', () => {
		const result = mount(StateHooks, {});

		expect(result.find('#count').textContent).toBe('1');
		result.click('#increment');
		expect(result.find('#count').textContent).toBe('2');
		result.click('#increment');
		expect(result.find('#count').textContent).toBe('2');

		expect(result.find('#opened').textContent).toBe('closed');
		result.click('#open');
		expect(result.find('#opened').textContent).toBe('open');

		result.click('#append');
		expect(result.find('#items').textContent).toBe('Ada,Grace');
		result.unmount();
	});
});
