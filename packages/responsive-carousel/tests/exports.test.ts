import { describe, expect, it } from 'vitest';
import { Carousel } from '../src/index';

describe('@octanejs/responsive-carousel exports', () => {
	it('exposes the carousel component', () => {
		expect(Carousel).toBeTypeOf('function');
	});
});
