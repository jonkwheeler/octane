import { afterEach, describe, expect, it, vi } from 'vitest';
import { raf } from '@react-spring/rafz';
import { flushEffects, mount } from '../../../motion/tests/_helpers';
import { ContextSpringFixture, SpringHookFixture, TrailHookFixture } from '../_fixtures/hooks.tsrx';

afterEach(() => {
	vi.useRealTimers();
	raf.frameLoop = 'always';
});

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
	});

	it('adds trail staggering to the caller delay', async () => {
		vi.useFakeTimers();
		let styles: any[];
		const result = mount(TrailHookFixture, {
			delay: 100,
			onReady: (value: any[]) => (styles = value),
		});
		flushEffects();

		await vi.advanceTimersByTimeAsync(99);
		expect(styles![0]?.x).toBeUndefined();
		expect(styles![1]?.x).toBeUndefined();

		await vi.advanceTimersByTimeAsync(1);
		expect(styles![0].x.get()).toBe(1);
		expect(styles![1]?.x).toBeUndefined();

		await vi.advanceTimersByTimeAsync(16);
		expect(styles![1].x.get()).toBe(1);
		result.unmount();
	});

	it('applies SpringContext values and resumes after context pause', () => {
		let styles: any;
		const onReady = (value: any) => (styles = value);
		const result = mount(ContextSpringFixture, { pause: true, onReady });
		flushEffects();
		expect(styles.x.get()).toBe(0);

		result.update(ContextSpringFixture, { pause: false, onReady });
		flushEffects();
		expect(styles.x.get()).toBe(1);
		result.unmount();
	});
});
