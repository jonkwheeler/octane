import { router } from '@inertiajs/core';
import { useEffect, useState } from 'octane';

type SetStateAction<State> = State | ((previousState: State) => State);
type Dispatch<Action> = (action: Action) => void;
type MutableRefObject<Value> = { current: Value };
const stateSlot = Symbol('Inertia.useRemember.state');
const effectSlot = Symbol('Inertia.useRemember.effect');

export default function useRemember<State>(
	initialState: State,
	key?: string | symbol,
	excludeKeysRef?: MutableRefObject<string[]> | symbol,
): [State, Dispatch<SetStateAction<State>>] {
	key = typeof key === 'symbol' ? undefined : key;
	excludeKeysRef = typeof excludeKeysRef === 'symbol' ? undefined : excludeKeysRef;
	const [state, setState] = useState(() => {
		const restored = router.restore(key) as State;

		return restored !== undefined ? restored : initialState;
	}, stateSlot);

	useEffect(
		() => {
			const keys = excludeKeysRef?.current;
			if (keys && keys.length > 0 && typeof state === 'object' && state !== null) {
				const filtered = { ...state } as Record<string, unknown>;
				keys.forEach((k) => delete filtered[k]);
				router.remember(filtered, key);
			} else {
				router.remember(state, key);
			}
		},
		[state, key],
		effectSlot,
	);

	return [state, setState];
}
