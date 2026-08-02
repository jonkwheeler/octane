// Adapted from Vaul's vendored Radix controllable-state helper. Every composed
// Octane hook receives a stable sub-slot because this module ships as plain TS.
import { useCallback, useEffect, useMemo, useRef, useState } from 'octane';
import type { Dispatch, SetStateAction } from 'react';
import { subSlot } from './internal';

type UseControllableStateParams<T> = {
	prop?: T;
	defaultProp?: T;
	onChange?: (state: T) => void;
};

type SetStateFn<T> = (prevState?: T) => T;

function useCallbackRef<T extends (...args: any[]) => any>(
	callback: T | undefined,
	slot?: symbol,
): T {
	const callbackRef = useRef(callback, subSlot(slot, 'ref'));
	useEffect(
		() => {
			callbackRef.current = callback;
		},
		[callback],
		subSlot(slot, 'effect'),
	);
	return useMemo(
		() => ((...args) => callbackRef.current?.(...args)) as T,
		[],
		subSlot(slot, 'memo'),
	);
}

function useUncontrolledState<T>(
	{ defaultProp, onChange }: Omit<UseControllableStateParams<T>, 'prop'>,
	slot?: symbol,
) {
	const uncontrolledState = useState<T | undefined>(defaultProp, subSlot(slot, 'state'));
	const [value] = uncontrolledState;
	const prevValueRef = useRef(value, subSlot(slot, 'previous'));
	const handleChange = useCallbackRef(onChange, subSlot(slot, 'change'));

	useEffect(
		() => {
			if (prevValueRef.current !== value) {
				handleChange(value as T);
				prevValueRef.current = value;
			}
		},
		[value, handleChange],
		subSlot(slot, 'effect'),
	);

	return uncontrolledState;
}

export function useControllableState<T>(
	{ prop, defaultProp, onChange = () => {} }: UseControllableStateParams<T>,
	slot?: symbol,
) {
	const [uncontrolledProp, setUncontrolledProp] = useUncontrolledState(
		{ defaultProp, onChange },
		subSlot(slot, 'uncontrolled'),
	);
	const isControlled = prop !== undefined;
	const value = isControlled ? prop : uncontrolledProp;
	const handleChange = useCallbackRef(onChange, subSlot(slot, 'change'));

	const setValue: Dispatch<SetStateAction<T | undefined>> = useCallback(
		(nextValue) => {
			if (isControlled) {
				const setter = nextValue as SetStateFn<T>;
				const next = typeof nextValue === 'function' ? setter(prop) : nextValue;
				if (next !== prop) handleChange(next as T);
			} else {
				setUncontrolledProp(nextValue);
			}
		},
		[isControlled, prop, setUncontrolledProp, handleChange],
		subSlot(slot, 'setter'),
	);

	return [value, setValue] as const;
}
