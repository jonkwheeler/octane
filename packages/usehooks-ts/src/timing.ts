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
	const saved = useRef(callback, subSlot(slot, 'ref'));
	useIsoLayoutEffect(
		() => {
			saved.current = callback;
		},
		[callback],
		subSlot(slot, 'layout'),
	);
	useEffect(
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
	const saved = useRef(callback, subSlot(slot, 'ref'));
	useIsoLayoutEffect(
		() => {
			saved.current = callback;
		},
		[callback],
		subSlot(slot, 'layout'),
	);
	useEffect(
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
	const wrapped = useMemo(
		() => {
			let pending = false;
			const instance = debounce(
				(...callArgs: Parameters<T>) => {
					pending = false;
					return func(...callArgs);
				},
				delay,
				options,
			);
			const value = ((...callArgs: Parameters<T>) => {
				pending = true;
				return instance(...callArgs);
			}) as DebouncedState<T>;
			value.cancel = () => {
				pending = false;
				instance.cancel();
			};
			value.flush = () => {
				pending = false;
				instance.flush();
			};
			value.isPending = () => pending;
			return value;
		},
		[func, delay, options?.leading, options?.trailing, options?.maxWait],
		subSlot(slot, 'memo'),
	);
	useIsoLayoutEffect(() => () => wrapped.cancel(), [wrapped], subSlot(slot, 'cleanup'));
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
	const [debouncedValue, setDebouncedValue] = useState(value, subSlot(slot, 'state'));
	const previous = useRef(value, subSlot(slot, 'previous'));
	const update = useDebounceCallback(setDebouncedValue, delay, options, subSlot(slot, 'callback'));
	const equal = options?.equalityFn ?? ((left: T, right: T) => left === right);
	if (!equal(previous.current, value)) {
		update(value);
		previous.current = value;
	}
	return [debouncedValue, update];
}
