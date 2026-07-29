import { useCallback, useEffect, useRef } from 'octane';
import { splitSlot, subSlot } from './internal';

export function useUnmount(...runtime: [func: () => void, slot?: symbol]): void {
	const { args, slot } = splitSlot(runtime);
	const func = args[0]!;
	const ref = (useRef as any)(func, subSlot(slot, 'ref'));
	ref.current = func;
	(useEffect as any)(() => () => ref.current(), [], subSlot(slot, 'effect'));
}

export function useIsMounted(...runtime: [slot?: symbol]): () => boolean {
	const { slot } = splitSlot(runtime);
	const mounted = (useRef as any)(false, subSlot(slot, 'ref'));
	(useEffect as any)(
		() => {
			mounted.current = true;
			return () => {
				mounted.current = false;
			};
		},
		[],
		subSlot(slot, 'effect'),
	);
	return (useCallback as any)(() => mounted.current, [], subSlot(slot, 'callback'));
}
