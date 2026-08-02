import { useCallback } from 'octane';
import type { MutableRefObject, Ref } from 'react';

type PossibleRef<T> = Ref<T> | undefined;

function setRef<T>(ref: PossibleRef<T>, value: T) {
	if (typeof ref === 'function') ref(value);
	else if (ref != null) (ref as MutableRefObject<T>).current = value;
}

export function composeRefs<T>(...refs: PossibleRef<T>[]) {
	return (node: T) => refs.forEach((ref) => setRef(ref, node));
}

export function useComposedRefs<T>(...runtime: Array<PossibleRef<T> | symbol>) {
	const tail = runtime[runtime.length - 1];
	const slot = typeof tail === 'symbol' ? tail : undefined;
	const refs = (slot ? runtime.slice(0, -1) : runtime) as PossibleRef<T>[];
	return useCallback(composeRefs(...refs), refs, slot);
}
