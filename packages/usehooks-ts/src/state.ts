import { useCallback, useState } from 'octane';
import { splitSlot, subSlot } from './internal';
import type { Dispatch, SetStateAction } from './types';

export interface UseBooleanReturn {
	value: boolean;
	setValue: Dispatch<SetStateAction<boolean>>;
	setTrue: () => void;
	setFalse: () => void;
	toggle: () => void;
}

export function useBoolean(...runtime: [defaultValue?: boolean, slot?: symbol]): UseBooleanReturn {
	const { args, slot } = splitSlot(runtime);
	const defaultValue = args[0] ?? false;
	if (typeof defaultValue !== 'boolean') throw new Error('defaultValue must be `true` or `false`');
	const [value, setValue] = (useState as any)(defaultValue, subSlot(slot, 'state'));
	const setTrue = (useCallback as any)(() => setValue(true), [], subSlot(slot, 'true'));
	const setFalse = (useCallback as any)(() => setValue(false), [], subSlot(slot, 'false'));
	const toggle = (useCallback as any)(
		() => setValue((x: boolean) => !x),
		[],
		subSlot(slot, 'toggle'),
	);
	return { value, setValue, setTrue, setFalse, toggle };
}

export interface UseCounterReturn {
	count: number;
	increment: () => void;
	decrement: () => void;
	reset: () => void;
	setCount: Dispatch<SetStateAction<number>>;
}

export function useCounter(...runtime: [initialValue?: number, slot?: symbol]): UseCounterReturn {
	const { args, slot } = splitSlot(runtime);
	const initialValue = args[0];
	const [count, setCount] = (useState as any)(initialValue ?? 0, subSlot(slot, 'state'));
	const increment = (useCallback as any)(
		() => setCount((x: number) => x + 1),
		[],
		subSlot(slot, 'inc'),
	);
	const decrement = (useCallback as any)(
		() => setCount((x: number) => x - 1),
		[],
		subSlot(slot, 'dec'),
	);
	const reset = (useCallback as any)(
		() => setCount(initialValue ?? 0),
		[initialValue],
		subSlot(slot, 'reset'),
	);
	return { count, increment, decrement, reset, setCount };
}

export function useToggle(
	...runtime: [defaultValue?: boolean, slot?: symbol]
): [boolean, () => void, Dispatch<SetStateAction<boolean>>] {
	const { args, slot } = splitSlot(runtime);
	const [value, setValue] = (useState as any)(!!args[0], subSlot(slot, 'state'));
	const toggle = (useCallback as any)(
		() => setValue((x: boolean) => !x),
		[],
		subSlot(slot, 'toggle'),
	);
	return [value, toggle, setValue];
}

export interface Actions<K, V> {
	set: (key: K, value: V) => void;
	setAll: (entries: Iterable<readonly [K, V]>) => void;
	remove: (key: K) => void;
	reset: () => void;
}

export function useMap<K, V>(
	...runtime: [initialState?: Map<K, V> | Iterable<readonly [K, V]>, slot?: symbol]
): [Map<K, V>, Actions<K, V>] {
	const { args: rawArgs, slot } = splitSlot(runtime);
	const args = rawArgs as [initialState?: Map<K, V> | Iterable<readonly [K, V]>];
	const [map, setMap] = (useState as any)(() => new Map(args[0]), subSlot(slot, 'state'));
	const actions: Actions<K, V> = {
		set: (useCallback as any)(
			(key: K, value: V) => setMap((prev: Map<K, V>) => new Map(prev).set(key, value)),
			[],
			subSlot(slot, 'set'),
		),
		setAll: (useCallback as any)(
			(entries: Iterable<readonly [K, V]>) => setMap(new Map(entries)),
			[],
			subSlot(slot, 'all'),
		),
		remove: (useCallback as any)(
			(key: K) =>
				setMap((prev: Map<K, V>) => {
					const copy = new Map(prev);
					copy.delete(key);
					return copy;
				}),
			[],
			subSlot(slot, 'remove'),
		),
		reset: (useCallback as any)(() => setMap(new Map()), [], subSlot(slot, 'reset')),
	};
	return [map, actions];
}

export interface UseStepActions {
	goToNextStep: () => void;
	goToPrevStep: () => void;
	canGoToNextStep: boolean;
	canGoToPrevStep: boolean;
	setStep: Dispatch<SetStateAction<number>>;
	reset: () => void;
}

export function useStep(...runtime: [maxStep: number, slot?: symbol]): [number, UseStepActions] {
	const { args: rawArgs, slot } = splitSlot(runtime);
	const args = rawArgs as [number];
	const maxStep = args[0]!;
	const [currentStep, setCurrentStep] = (useState as any)(1, subSlot(slot, 'state'));
	const canGoToNextStep = currentStep + 1 <= maxStep;
	const canGoToPrevStep = currentStep - 1 > 0;
	const setStep = (useCallback as any)(
		(step: SetStateAction<number>) => {
			const next = typeof step === 'function' ? step(currentStep) : step;
			if (next < 1 || next > maxStep) throw new Error('Step not valid');
			setCurrentStep(next);
		},
		[maxStep, currentStep],
		subSlot(slot, 'set'),
	);
	const goToNextStep = (useCallback as any)(
		() => {
			if (canGoToNextStep) setCurrentStep((step: number) => step + 1);
		},
		[canGoToNextStep],
		subSlot(slot, 'next'),
	);
	const goToPrevStep = (useCallback as any)(
		() => {
			if (canGoToPrevStep) setCurrentStep((step: number) => step - 1);
		},
		[canGoToPrevStep],
		subSlot(slot, 'prev'),
	);
	const reset = (useCallback as any)(() => setCurrentStep(1), [], subSlot(slot, 'reset'));
	return [
		currentStep,
		{ goToNextStep, goToPrevStep, canGoToNextStep, canGoToPrevStep, setStep, reset },
	];
}
