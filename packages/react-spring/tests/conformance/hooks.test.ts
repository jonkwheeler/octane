import { describe, expect, it } from 'vitest';
import { raf } from '@react-spring/rafz';
import { flushEffects, mount } from '../../../motion/tests/_helpers';
import { SpringHookFixture } from '../_fixtures/hooks.tsrx';

describe('React Spring hooks', () => {
	it('keeps spring values and the imperative API stable across updates', () => {
		raf.frameLoop = 'demand';
		const apis: unknown[] = [];
		let renders = 0;
		const result = mount(SpringHookFixture, {
			x: 10,
			onReady: (api: unknown) => apis.push(api),
			onRender: () => renders++,
		});
		flushEffects();
		raf.advance();
		expect((result.find('#hook-spring') as HTMLElement).style.left).toBe('10px');

		result.update(SpringHookFixture, {
			x: 25,
			onReady: (api: unknown) => apis.push(api),
			onRender: () => renders++,
		});
		flushEffects();
		raf.advance();

		expect((result.find('#hook-spring') as HTMLElement).style.left).toBe('25px');
		expect(apis[1]).toBe(apis[0]);
		expect(renders).toBe(2);
		result.unmount();
		raf.frameLoop = 'always';
	});
});
