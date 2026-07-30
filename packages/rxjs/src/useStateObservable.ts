import { liftSuspense, NoSubscribersError, StatePromise } from '@rx-state/core';
import { useRef, useState, useSyncExternalStore } from 'octane';
import type { DefaultedStateObservable, StateObservable, SUSPENSE } from '@rx-state/core';
import { useSubscription } from './context.ts';
import { subSlot } from './internal.ts';

type Value<T> = Exclude<T, typeof SUSPENSE>;
type VoidCallback = () => void;

interface ObservableRef<T> {
	source: StateObservable<T>;
	subscribe: (callback: VoidCallback) => VoidCallback;
	getSnapshot: () => Value<T>;
}

export function useStateObservable<T>(source: StateObservable<T>, slot?: symbol): Value<T> {
	const subscription = useSubscription();
	const [, setError] = useState<unknown>(undefined, subSlot(slot, 'error'));
	const callbackRef = useRef<ObservableRef<T> | undefined>(undefined, subSlot(slot, 'callbacks'));

	if (!callbackRef.current) {
		const getSnapshot = () => {
			const current = callbackRef.current!.source as DefaultedStateObservable<T>;
			if (!current.getRefCount() && !current.getDefaultValue) {
				if (!subscription) throw new Error('Missing Subscribe!');
				subscription(current);
			}
			const value = current.getValue();
			if (value instanceof StatePromise) {
				throw value.catch((error) => {
					if (error instanceof NoSubscribersError) return error;
					throw error;
				});
			}
			return value as Value<T>;
		};
		callbackRef.current = {
			source,
			subscribe: () => () => {},
			getSnapshot,
		};
	}

	const ref = callbackRef.current;
	if (ref.source !== source) ref.source = source;
	ref.subscribe = (notify) => {
		const active = liftSuspense()(source).subscribe({
			next: notify,
			error: (error) =>
				setError(() => {
					throw error;
				}),
		});
		return () => active.unsubscribe();
	};

	return useSyncExternalStore(
		ref.subscribe,
		ref.getSnapshot,
		ref.getSnapshot,
		subSlot(slot, 'store'),
	);
}
