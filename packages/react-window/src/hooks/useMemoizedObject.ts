import { useMemo } from 'octane';
import { splitSlot, subSlot } from '../internal';

export function useMemoizedObject<Type extends object>(
	unstableObject: Type,
	...rest: unknown[]
): Type {
	const [, slot] = splitSlot(rest);
	return useMemo(
		() => unstableObject,
		Object.values(unstableObject),
		subSlot(slot, 'memoized-object'),
	);
}
