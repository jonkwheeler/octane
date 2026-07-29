import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushEffects, mount } from '../../octane/tests/_helpers';
import { TimingProbe } from './_fixtures/hooks.tsrx';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
	vi.useRealTimers();
	document.body.replaceChildren();
});

describe('timing and lifecycle hooks', () => {
	it('runs current callbacks and cancels timers and debounce work on unmount', () => {
		const callbacks = {
			onDebounce: vi.fn(),
			onInterval: vi.fn(),
			onTimeout: vi.fn(),
			onUnmount: vi.fn(),
		};
		const result = mount(TimingProbe, callbacks);
		flushEffects();
		result.click('#debounce');
		vi.advanceTimersByTime(40);
		expect(callbacks.onInterval).toHaveBeenCalledTimes(2);
		expect(callbacks.onTimeout).toHaveBeenCalledTimes(1);
		expect(callbacks.onDebounce).not.toHaveBeenCalled();
		result.unmount();
		flushEffects();
		vi.advanceTimersByTime(100);
		expect(callbacks.onDebounce).not.toHaveBeenCalled();
		expect(callbacks.onInterval).toHaveBeenCalledTimes(2);
		expect(callbacks.onUnmount).toHaveBeenCalledTimes(1);
	});
});
