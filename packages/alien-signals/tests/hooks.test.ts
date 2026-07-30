import { describe, expect, it } from 'vitest';
import { createComputed, createSignal } from '@octanejs/alien-signals';
import { mount, nextPaint } from './_helpers';
import {
	ComputedReader,
	SetterProbe,
	SignalReaders,
	SwitchingReader,
} from './_fixtures/hooks.tsrx';

describe('@octanejs/alien-signals hooks', () => {
	it('keeps readable and writable subscriptions live and independent', async () => {
		const left = createSignal(1);
		const base = createSignal(5);
		const right = createComputed(() => base() * 2);
		const result = mount(SignalReaders, { left, right });

		expect(result.find('#values').textContent).toBe('1/10');
		result.click('#increment');
		await nextPaint();
		expect(result.find('#values').textContent).toBe('2/10');
		base(6);
		await nextPaint();
		expect(result.find('#values').textContent).toBe('2/12');
		result.click('#set');
		await nextPaint();
		expect(result.find('#values').textContent).toBe('10/12');
		result.unmount();
	});

	it('moves the subscription when signal identity changes', async () => {
		const first = createSignal(1);
		const second = createSignal(10);
		const result = mount(SwitchingReader, { first, second });

		result.click('#switch');
		expect(result.find('#switch-value').textContent).toBe('10');
		first(2);
		await nextPaint();
		expect(result.find('#switch-value').textContent).toBe('10');
		second(11);
		await nextPaint();
		expect(result.find('#switch-value').textContent).toBe('11');
		result.unmount();
	});

	it('retains a computed signal until explicit dependencies change', async () => {
		const source = createSignal(2);
		const result = mount(ComputedReader, { source, multiplier: 3 });

		expect(result.find('#computed').textContent).toBe('6');
		source(4);
		await nextPaint();
		expect(result.find('#computed').textContent).toBe('12');
		result.update(ComputedReader, { source, multiplier: 5 });
		expect(result.find('#computed').textContent).toBe('20');
		result.unmount();
	});

	it('retains setter identity for a stable signal and retargets a replacement', () => {
		const first = createSignal(1);
		const second = createSignal(10);
		const setters: Array<(value: number | ((previous: number) => number)) => void> = [];
		const record = (setter: (value: number | ((previous: number) => number)) => void) => {
			setters.push(setter);
		};
		const result = mount(SetterProbe, { source: first, record });
		const initialSetter = setters.at(-1);

		result.click('#rerender');
		expect(setters.at(-1)).toBe(initialSetter);

		result.update(SetterProbe, { source: second, record });
		const replacementSetter = setters.at(-1);
		expect(replacementSetter).not.toBe(initialSetter);
		replacementSetter?.((value) => value + 1);
		expect(first()).toBe(1);
		expect(second()).toBe(11);
		result.unmount();
	});
});
