import { afterEach, describe, expect, it } from 'vitest';
import { mount, nextPaint } from '../../../octane/tests/_helpers';
import { NprogressApp } from '../_fixtures/nprogress.tsrx';
import { nprogress, nprogressStore } from '@octanejs/mantine-nprogress';

afterEach(() => nprogress.reset());

describe('@octanejs/mantine-nprogress', () => {
	it('updates the rendered progress bar through the shared store', async () => {
		const result = mount(NprogressApp, {});
		result.click('#set');
		await Promise.resolve();
		await nextPaint();
		expect(nprogressStore.getState()).toMatchObject({ mounted: true, progress: 42 });
		expect(result.container.querySelector('[data-mounted]')).not.toBeNull();
		result.unmount();
	});
});
