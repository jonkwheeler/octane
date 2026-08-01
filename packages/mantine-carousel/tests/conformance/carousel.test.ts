import { describe, expect, it } from 'vitest';
import { mount, nextPaint } from '../../../octane/tests/_helpers';
import { CarouselApp } from '../_fixtures/carousel.tsrx';

describe('@octanejs/mantine-carousel', () => {
	it('renders slides and initializes Embla controls', async () => {
		globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as any;
		globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} } as any;
		const result = mount(CarouselApp, {});
		await nextPaint();
		expect(result.container.textContent).toContain('First');
		expect(result.container.textContent).toContain('Second');
		expect(result.container.querySelector('[aria-label="Next slide"]')).not.toBeNull();
		result.unmount();
	});
});
