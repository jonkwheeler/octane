import { describe, expect, it } from 'vitest';
import { FormFixture } from '../_fixtures/form.tsrx';
import { mount, nextPaint } from '../../../octane/tests/_helpers';

describe('@octanejs/mantine-form', () => {
	it('updates, validates, and provides forms and fields', async () => {
		const result = mount(FormFixture, {});
		const name = result.find('#name') as HTMLInputElement;

		name.value = 'A';
		name.dispatchEvent(new Event('input', { bubbles: true }));
		await nextPaint();
		expect(result.find('#name-value').textContent).toBe('A');
		expect(result.find('#context-value').textContent).toBe('A');

		result.click('#validate');
		await nextPaint();
		expect(result.find('#name-error').textContent).toBe('Too short');

		const field = result.find('#field') as HTMLInputElement;
		field.value = 'changed';
		field.dispatchEvent(new Event('input', { bubbles: true }));
		await nextPaint();
		expect(result.find('#field-value').textContent).toBe('changed');

		result.click('#field-validate');
		await nextPaint();
		expect(result.find('#field-error').textContent).toBe('Invalid field');

		result.unmount();
	});
});
