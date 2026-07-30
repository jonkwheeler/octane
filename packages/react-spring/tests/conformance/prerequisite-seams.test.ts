import { describe, expect, it } from 'vitest';
import { raf } from '@react-spring/rafz';
import { mount, nextPaint } from '../../../motion/tests/_helpers';
import { AnimatedHostFixture } from '../_fixtures/animated-host.tsrx';

describe('React Spring prerequisite seams', () => {
	it('applies related fluid values coherently without rerendering the component', async () => {
		let values: { x: { set(value: number): void }; y: { set(value: number): void } } | undefined;
		const rendered = { count: 0 };
		const result = mount(AnimatedHostFixture, {
			onReady(next: typeof values) {
				values = next;
				rendered.count++;
			},
		});

		await nextPaint();
		const initialRenders = rendered.count;
		raf.frameLoop = 'demand';
		values!.x.set(12);
		values!.y.set(24);
		raf.advance();

		const host = result.find('#animated-host') as HTMLElement;
		expect(host.style.left).toBe('12px');
		expect(host.style.top).toBe('24px');
		expect(rendered.count).toBe(initialRenders);
		result.unmount();
		raf.frameLoop = 'always';
	});

	it('cancels queued host writes during unmount', async () => {
		let values: { x: { set(value: number): void } } | undefined;
		const result = mount(AnimatedHostFixture, {
			onReady(next: typeof values) {
				values = next;
			},
		});
		await nextPaint();

		raf.frameLoop = 'demand';
		values!.x.set(40);
		result.unmount();
		raf.advance();

		expect(result.container.querySelector('#animated-host')).toBe(null);
		raf.frameLoop = 'always';
	});
});
