import { afterEach, describe, expect, it, vi } from 'vitest';
import { raf } from '@react-spring/rafz';
import { flushEffects, mount } from '../../../motion/tests/_helpers';
import {
	ContextSpringFixture,
	NestedContextSpringFixture,
	SpringHookFixture,
	SpringsCohortFixture,
	TrailHookFixture,
} from '../_fixtures/hooks.tsrx';

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

	it('reuses a spring cohort, only evaluates changed deps, and resizes the ref', () => {
		const created: number[] = [];
		let styles: any[] = [];
		let api: any;
		const onReady = (nextStyles: any[], nextApi: any) => {
			styles = nextStyles;
			api = nextApi;
		};
		const onCreate = (index: number) => created.push(index);
		const result = mount(SpringsCohortFixture, { count: 2, goal: 1, onCreate, onReady });
		flushEffects();
		const first = styles.slice();
		expect(created).toEqual([0, 1]);

		result.update(SpringsCohortFixture, { count: 2, goal: 1, onCreate, onReady });
		flushEffects();
		expect(created).toEqual([0, 1]);
		expect(styles).toEqual(first);

		result.update(SpringsCohortFixture, { count: 3, goal: 1, onCreate, onReady });
		flushEffects();
		expect(created).toEqual([0, 1, 2]);
		expect(api.current).toHaveLength(3);
		expect(styles.slice(0, 2)).toEqual(first);

		result.update(SpringsCohortFixture, { count: 1, goal: 2, onCreate, onReady });
		flushEffects();
		expect(created).toEqual([0, 1, 2, 0]);
		expect(api.current).toHaveLength(1);
		expect(styles[0]).toBe(first[0]);
		result.unmount();
	});

	it('merges nested SpringContext values while allowing replacement', () => {
		let styles: any;
		const onReady = (value: any) => (styles = value);
		const result = mount(NestedContextSpringFixture, { pause: true, onReady });
		flushEffects();
		expect(styles.x.get()).toBe(0);

		result.update(NestedContextSpringFixture, { pause: false, onReady });
		flushEffects();
		expect(styles.x.get()).toBe(1);
		result.unmount();
	});
});
