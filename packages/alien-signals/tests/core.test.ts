import { describe, expect, it } from 'vitest';
import {
	createComputed,
	createEffect,
	createSignal,
	createSignalScope,
} from '@octanejs/alien-signals';

describe('@octanejs/alien-signals core helpers', () => {
	it('creates writable and computed signals', () => {
		const count = createSignal(1);
		const doubled = createComputed(() => count() * 2);

		expect(doubled()).toBe(2);
		count(3);
		expect(doubled()).toBe(6);
		count((previous) => previous + 2);
		expect(count()).toBe(5);
		expect(doubled()).toBe(10);
	});

	it('stops effects and grouped scopes', () => {
		const count = createSignal(0);
		const effectValues: number[] = [];
		const scopedValues: string[] = [];
		const stopEffect = createEffect(() => effectValues.push(count()));
		const stopScope = createSignalScope(() => {
			createEffect(() => scopedValues.push('a:' + count()));
			createEffect(() => scopedValues.push('b:' + count()));
		});

		count(1);
		expect(effectValues).toEqual([0, 1]);
		expect(scopedValues).toEqual(['a:0', 'b:0', 'a:1', 'b:1']);

		stopEffect();
		stopScope();
		count(2);
		expect(effectValues).toEqual([0, 1]);
		expect(scopedValues).toEqual(['a:0', 'b:0', 'a:1', 'b:1']);
	});
});
