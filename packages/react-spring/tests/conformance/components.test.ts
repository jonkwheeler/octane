import { raf } from '@react-spring/rafz';
import { describe, expect, it } from 'vitest';
import { flushEffects, mount } from '../../../motion/tests/_helpers';
import { SpringComponentFixture } from '../_fixtures/components.tsrx';

describe('React Spring render-prop components', () => {
	it('renders Spring children with animated values', () => {
		raf.frameLoop = 'demand';
		const result = mount(SpringComponentFixture);
		flushEffects();
		raf.advance();

		expect((result.find('#spring-component') as HTMLElement).style.opacity).toBe('1');
		result.unmount();
		raf.frameLoop = 'always';
	});
});
