import { afterEach, describe, expect, it } from 'vitest';
import { NotificationsApp } from '../_fixtures/notifications.tsrx';
import { mount, nextPaint } from '../../../octane/tests/_helpers';
import { notifications } from '@octanejs/mantine-notifications';

afterEach(() => notifications.clean());

describe('@octanejs/mantine-notifications', () => {
	it('shows and hides notifications through the shared store', async () => {
		window.matchMedia = () =>
			({
				matches: false,
				addEventListener() {},
				removeEventListener() {},
			}) as unknown as MediaQueryList;

		const result = mount(NotificationsApp, {});
		result.click('#show');
		await Promise.resolve();
		await nextPaint();
		expect(result.container.textContent).toContain('Welcome');
		expect(result.container.textContent).toContain('Ready to go');
		notifications.hide('welcome');
		await Promise.resolve();
		await nextPaint();
		expect(result.container.textContent).not.toContain('Ready to go');
		result.unmount();
	});
});
