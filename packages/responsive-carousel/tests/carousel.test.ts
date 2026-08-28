import { describe, expect, it, vi } from 'vitest';
import { mount } from '../../octane/tests/_helpers';
import { CarouselChildrenFixture, EmptyCarouselFixture } from './_fixtures/carousel.tsrx';

describe('@octanejs/responsive-carousel rendering', () => {
	it('treats authored component children as individual slides', () => {
		const app = mount(CarouselChildrenFixture);

		expect(app.findAll('.slider > .slide')).toHaveLength(2);
		expect(app.findAll('.slider > .slide').map((slide) => slide.textContent)).toEqual([
			'first',
			'second',
		]);
		expect(app.findAll('.control-dots > .dot')).toHaveLength(2);

		app.click('.control-next');
		expect(
			app.findAll('.slider > .slide').map((slide) => slide.getAttribute('aria-hidden')),
		).toEqual(['true', 'false']);

		app.unmount();
	});

	it('ignores navigation when there are no slides', () => {
		const onChange = vi.fn();
		const app = mount(EmptyCarouselFixture, { onChange });

		app.click('.control-next');
		expect(onChange).not.toHaveBeenCalled();

		app.unmount();
	});
});
