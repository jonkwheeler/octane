import type { Store, SyncStatus } from '@livestore/livestore';
import { useDebugValue, useEffect, useState } from 'octane';
import { splitSlot, subSlot } from './internal';

export function useSyncStatus(options: { store: Store<any> }): SyncStatus;
export function useSyncStatus(
	options: { store: Store<any> },
	...rest: [slot?: symbol]
): SyncStatus {
	const [, slot] = splitSlot(rest);
	const { store } = options;
	const [status, setStatus] = useState(() => store.syncStatus(), subSlot(slot, 'sync:status'));
	useEffect(() => store.subscribeSyncStatus(setStatus), [store], subSlot(slot, 'sync:effect'));
	useDebugValue(
		`LiveStore:useSyncStatus:${status.isSynced === true ? 'synced' : 'pending'}`,
		undefined,
		subSlot(slot, 'sync:debug'),
	);
	return status;
}
