import type { DependencyList } from 'react';
import { useEffect, useRef } from 'octane';

export function useDidUpdate(fn: () => void | (() => void), dependencies?: DependencyList) {
	const mounted = useRef(false);

	useEffect(
		() => () => {
			mounted.current = false;
		},
		[],
	);

	useEffect(
		() => {
			if (mounted.current) {
				return fn();
			}

			mounted.current = true;
			return undefined;
		},
		dependencies ? [...dependencies] : dependencies,
	);
}
