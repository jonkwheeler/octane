import { describe, expect, it } from 'vitest';
import { mount, nextPaint } from '../../../octane/tests/_helpers';
import { StoreApp } from '../_fixtures/store.tsrx';

describe('@octanejs/mantine-store', () => {
	it('notifies Octane subscribers when state changes', async () => {
		const result = mount(StoreApp, {});
		expect(result.find('#increment').textContent).toBe('0');
		result.click('#increment');
		await Promise.resolve();
		await nextPaint();
		expect(result.find('#increment').textContent).toBe('1');
		result.unmount();
	});
});
