import debounce from 'lodash.debounce';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'octane';
import { splitSlot, subSlot } from './internal';
import type { DebounceOptions, DebouncedState } from './types';

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function useInterval(
	...runtime: [callback: () => void, delay: number | null, slot?: symbol]
): void {
	const { args: rawArgs, slot } = splitSlot(runtime);
	const args = rawArgs as [() => void, number | null];
	const [callback, delay] = args;
	const saved = (useRef as any)(callback, subSlot(slot, 'ref'));
	(useIsoLayoutEffect as any)(
		() => {
			saved.current = callback;
		},
		[callback],
		subSlot(slot, 'layout'),
	);
	(useEffect as any)(
		() => {
			if (delay === null) return;
			const id = setInterval(() => saved.current(), delay);
			return () => clearInterval(id);
		},
		[delay],
		subSlot(slot, 'effect'),
	);
}

export function useTimeout(
	...runtime: [callback: () => void, delay: number | null, slot?: symbol]
): void {
	const { args: rawArgs, slot } = splitSlot(runtime);
	const args = rawArgs as [() => void, number | null];
	const [callback, delay] = args;
	const saved = (useRef as any)(callback, subSlot(slot, 'ref'));
	(useIsoLayoutEffect as any)(
		() => {
			saved.current = callback;
		},
		[callback],
		subSlot(slot, 'layout'),
	);
	(useEffect as any)(
		() => {
			if (!delay && delay !== 0) return;
			const id = setTimeout(() => saved.current(), delay);
			return () => clearTimeout(id);
		},
		[delay],
		subSlot(slot, 'effect'),
	);
}

export function useDebounceCallback<T extends (...args: any[]) => ReturnType<T>>(
	...runtime: [func: T, delay?: number, options?: DebounceOptions, slot?: symbol]
): DebouncedState<T> {
	const { args: rawArgs, slot } = splitSlot(runtime);
	const args = rawArgs as [T, number?, DebounceOptions?];
	const [func, delay = 500, options] = args;
	const active = (useRef as any)(undefined, subSlot(slot, 'active'));
	const wrapped = (useMemo as any)(
		() => {
			const instance = debounce(func!, delay, options);
			const value = ((...callArgs: Parameters<T>) => instance(...callArgs)) as DebouncedState<T>;
			value.cancel = () => instance.cancel();
			value.flush = () => {
				instance.flush();
			};
			value.isPending = () => !!active.current;
			return value;
		},
		[func, delay, options],
		subSlot(slot, 'memo'),
	);
	(useEffect as any)(
		() => {
			active.current = wrapped;
			return () => {
				wrapped.cancel();
				active.current = undefined;
			};
		},
		[wrapped],
		subSlot(slot, 'effect'),
	);
	return wrapped;
}

export interface UseDebounceValueOptions<T> extends DebounceOptions {
	equalityFn?: (left: T, right: T) => boolean;
}

export function useDebounceValue<T>(
	...runtime: [
		initialValue: T | (() => T),
		delay?: number,
		options?: UseDebounceValueOptions<T>,
		slot?: symbol,
	]
): [T, DebouncedState<(value: T) => void>] {
	const { args: rawArgs, slot } = splitSlot(runtime);
	const args = rawArgs as [T | (() => T), number?, UseDebounceValueOptions<T>?];
	const [initialValue, delay, options] = args;
	const value = initialValue instanceof Function ? initialValue() : initialValue!;
	const [debouncedValue, setDebouncedValue] = (useState as any)(value, subSlot(slot, 'state'));
	const previous = (useRef as any)(value, subSlot(slot, 'previous'));
	const update = (useDebounceCallback as any)(
		setDebouncedValue,
		delay,
		options,
		subSlot(slot, 'callback'),
	);
	const equal = options?.equalityFn ?? Object.is;
	if (!equal(previous.current, value)) {
		update(value);
		previous.current = value;
	}
	return [debouncedValue, update];
}
