import { useEffect, useState } from 'octane';
import { resolveHookSlot } from './slot';
import type { EdgeChange } from '@xyflow/system';

import { useStoreApi } from './useStore';
import type { Edge, Node } from '../types';

/**
 * Registers a middleware function to transform edge changes.
 *
 * @public
 * @param fn - Middleware function. Should be memoized with useCallback to avoid re-registration.
 */
export function experimental_useOnEdgesChangeMiddleware<EdgeType extends Edge = Edge>(
	fn: (changes: EdgeChange<EdgeType>[]) => EdgeChange<EdgeType>[],
	...rest: [slot?: symbol]
) {
	const slot = resolveHookSlot(rest);
	const store = useStoreApi<Node, EdgeType>(slot);
	const [symbol] = useState(function createSymbol() {
		return Symbol();
	}, slot);

	useEffect(
		function registerMiddleware() {
			const { onEdgesChangeMiddlewareMap } = store.getState();
			onEdgesChangeMiddlewareMap.set(symbol, fn);
		},
		[fn],
		slot,
	);

	useEffect(
		function unregisterMiddleware() {
			const { onEdgesChangeMiddlewareMap } = store.getState();
			return function cleanup() {
				onEdgesChangeMiddlewareMap.delete(symbol);
			};
		},
		[],
		slot,
	);
}
