import type { Store, SyncStatus } from '@livestore/livestore';
import { useDebugValue, useEffect, useRef, useState } from 'octane';
import { splitSlot, subSlot } from './internal';

export function useSyncStatus(options: { store: Store<any> }): SyncStatus;
export function useSyncStatus(
	options: { store: Store<any> },
	...rest: [slot?: symbol]
): SyncStatus {
	const [, slot] = splitSlot(rest);
	const { store } = options;
	const [, rerender] = useState(0, subSlot(slot, 'sync:status'));
	const current = useRef({ store, status: store.syncStatus() });
	if (current.current.store !== store) {
		current.current = { store, status: store.syncStatus() };
	}
	useEffect(
		() =>
			store.subscribeSyncStatus((status) => {
				current.current.status = status;
				rerender((value) => value + 1);
			}),
		[store],
		subSlot(slot, 'sync:effect'),
	);
	const { status } = current.current;
	useDebugValue(
		`LiveStore:useSyncStatus:${status.isSynced === true ? 'synced' : 'pending'}`,
		undefined,
		subSlot(slot, 'sync:debug'),
	);
	return status;
}
