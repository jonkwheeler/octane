import { describe, expect, it } from 'vitest';
import { mount, nextPaint } from '../../../octane/tests/_helpers';
import { ModalsApp } from '../_fixtures/modals.tsrx';
import { modals } from '@octanejs/mantine-modals';

describe('@octanejs/mantine-modals', () => {
	it('opens and closes content modals through external events', async () => {
		const result = mount(ModalsApp, {});
		result.click('#open');
		await Promise.resolve();
		await nextPaint();
		expect(result.container.textContent).toContain('Account');
		expect(result.container.textContent).toContain('Saved changes');
		modals.closeAll();
		await Promise.resolve();
		await nextPaint();
		expect(result.container.textContent).not.toContain('Saved changes');
		result.unmount();
	});
});
