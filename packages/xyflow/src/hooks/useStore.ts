import { useContext, useMemo } from 'octane';
import {
	type UseBoundStoreWithEqualityFn,
	useStoreWithEqualityFn as useZustandStore,
} from '@octanejs/zustand/traditional';
import type { StoreApi } from 'zustand';
import { errorMessages } from '@xyflow/system';

import StoreContext from '../contexts/StoreContext';
import type { Edge, Node, ReactFlowState } from '../types';

const zustandErrorMessage = errorMessages['error001']('react');

function useStore<StateSlice = unknown>(
	selector: (state: ReactFlowState) => StateSlice,
	equalityFn?: (a: StateSlice, b: StateSlice) => boolean,
	...rest: [slot?: symbol]
): StateSlice {
	const tail = rest[rest.length - 1];
	const slot = typeof tail === 'symbol' ? (tail as symbol) : undefined;
	const store = useContext(StoreContext);

	if (store === null) {
		throw new Error(zustandErrorMessage);
	}

	return useZustandStore(store, selector, equalityFn, slot);
}

function useStoreApi<NodeType extends Node = Node, EdgeType extends Edge = Edge>(
	...rest: [slot?: symbol]
) {
	const tail = rest[rest.length - 1];
	const slot = typeof tail === 'symbol' ? (tail as symbol) : undefined;
	const store = useContext(StoreContext) as UseBoundStoreWithEqualityFn<
		StoreApi<ReactFlowState<NodeType, EdgeType>>
	> | null;

	if (store === null) {
		throw new Error(zustandErrorMessage);
	}

	return useMemo(
		function memoStoreApi() {
			return {
				getState: store.getState,
				setState: store.setState,
				subscribe: store.subscribe,
			};
		},
		[store],
		slot,
	);
}

export { useStore, useStoreApi };
