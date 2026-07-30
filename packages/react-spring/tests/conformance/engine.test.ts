import { raf } from '@react-spring/rafz';
import { afterEach, describe, expect, it } from 'vitest';
import { Controller, SpringValue, config, to } from '@octanejs/react-spring';

afterEach(() => {
	raf.frameLoop = 'always';
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

	it('cancels an active animation with a cancelled result', async () => {
		raf.frameLoop = 'demand';
		const value = new SpringValue(0);
		const resultPromise = value.start(100);
		raf.advance();
		value.stop(true);

		expect(await resultPromise).toMatchObject({ finished: false, cancelled: true });
		expect(value.idle).toBe(true);
	});

	it('coordinates keyed values through Controller', async () => {
		raf.frameLoop = 'demand';
		const controller = new Controller({ from: { x: 0, opacity: 0 } });
		const resultPromise = controller.start({ to: { x: 20, opacity: 1 } });
		advanceUntilIdle();
		const result = await resultPromise;

		expect(result.finished).toBe(true);
		expect(controller.get()).toEqual({ x: 20, opacity: 1 });
	});

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
