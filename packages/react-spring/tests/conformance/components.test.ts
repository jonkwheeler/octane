import { raf } from '@react-spring/rafz';
import { describe, expect, it } from 'vitest';
import { flushEffects, mount } from '../../../motion/tests/_helpers';
import {
	SpringComponentFixture,
	TrailComponentFixture,
	TransitionComponentFixture,
} from '../_fixtures/components.tsrx';

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

	it('preserves keyed render-prop children when items reorder', () => {
		const first = { id: 'first', label: 'First' };
		const second = { id: 'second', label: 'Second' };
		for (const Fixture of [TrailComponentFixture, TransitionComponentFixture]) {
			const result = mount(Fixture, { items: [first, second] });
			flushEffects();
			const attribute = Fixture === TrailComponentFixture ? 'data-item-id' : 'data-transition-id';
			const firstNode = result.find(`[${attribute}="first"]`);
			const secondNode = result.find(`[${attribute}="second"]`);

			result.update(Fixture, { items: [second, first] });
			flushEffects();

			expect(result.findAll(`[${attribute}]`)).toEqual([secondNode, firstNode]);
			result.unmount();
		}
	});
});
