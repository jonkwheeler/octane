import { raf } from '@react-spring/rafz';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Controller, SpringValue, config, to } from '@octanejs/react-spring';

afterEach(() => {
	raf.frameLoop = 'always';
	vi.useRealTimers();
});

function advanceUntilIdle(limit = 240): void {
	const now = raf.now;
	let time = now();
	raf.now = () => (time += 16.667);
	try {
		for (let frame = 0; frame < limit; frame++) raf.advance();
	} finally {
		raf.now = now;
	}
}

describe('React Spring engine', () => {
	// Per packages/core/src/SpringValue.test.ts:15
	it('settles a loop without a usable from value instead of recursing', async () => {
		const value = new SpringValue(1);
		await expect(value.start({ to: 1, loop: true, immediate: true })).resolves.toMatchObject({
			finished: true,
		});
	});
	// Per packages/core/src/SpringValue.test.ts:25
	it('advances a spring and resolves its public result', async () => {
		raf.frameLoop = 'demand';
		const value = new SpringValue(0);
		const changes: number[] = [];
		value.onChange((next) => changes.push(next));

		const resultPromise = value.start({ to: 100, config: config.stiff });
		advanceUntilIdle();
		const result = await resultPromise;

		expect(result).toMatchObject({ value: 100, finished: true, cancelled: false });
		expect(changes.length).toBeGreaterThan(1);
		expect(value.get()).toBe(100);
	});

	// Per packages/core/src/SpringValue.test.ts:39
	it('cancels an active animation with a cancelled result', async () => {
		raf.frameLoop = 'demand';
		const value = new SpringValue(0);
		const resultPromise = value.start(100);
		raf.advance();
		value.stop(true);

		expect(await resultPromise).toMatchObject({ finished: false, cancelled: true });
		expect(value.idle).toBe(true);
	});

	// Per packages/core/src/Controller.test.ts:8
	it('coordinates keyed values through Controller', async () => {
		raf.frameLoop = 'demand';
		const controller = new Controller({ from: { x: 0, opacity: 0 } });
		const resultPromise = controller.start({ to: { x: 20, opacity: 1 } });
		advanceUntilIdle();
		const result = await resultPromise;

		expect(result.finished).toBe(true);
		expect(controller.get()).toEqual({ x: 20, opacity: 1 });
	});

	// Per packages/core/src/Controller.test.ts:23
	it('cancels a delayed controller start before it launches springs', async () => {
		vi.useFakeTimers();
		const controller = new Controller({ from: { x: 0 } });
		const resultPromise = controller.start({ to: { x: 20 }, delay: 100 });

		controller.stop(true);
		await vi.advanceTimersByTimeAsync(100);

		expect(await resultPromise).toEqual({ value: { x: 0 }, finished: false, cancelled: true });
		expect(controller.get()).toEqual({ x: 0 });
	});

	// Per packages/core/src/Interpolation.test.ts:6
	it('derives interpolated values from fluid parents', () => {
		const x = new SpringValue(0);
		const doubled = to(x, (value) => value * 2);
		const changes: number[] = [];
		const cleanup = doubled.onChange((value) => changes.push(value));

		x.set(5);
		expect(doubled.get()).toBe(10);
		expect(changes).toEqual([10]);
		cleanup();
	});
});
