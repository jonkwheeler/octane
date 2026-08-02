import { useCallback, useEffect, useRef, useState } from 'octane';
import { splitSlot, subSlot } from '../../internal';
import { getStorageKey } from './auto-save/getStorageKey';
import { readLegacyLayout } from './auto-save/readLegacyLayout';
import type {
	Layout,
	LayoutChangedMeta,
	LayoutStorage,
} from './types';

type UseDefaultLayoutOptions = {
	debounceSaveMs?: number;
	onlySaveAfterUserInteractions?: boolean;
	panelIds?: string[];
	storage?: LayoutStorage;
} & ({ groupId: string } | { id: string });

export function useDefaultLayout(
	options: UseDefaultLayoutOptions,
	...rest: [symbol?]
) {
	const [args, slot] = splitSlot(rest);
	if (args.length !== 0) throw new TypeError('useDefaultLayout() accepts one options argument.');
	const {
		debounceSaveMs = 100,
		onlySaveAfterUserInteractions,
		panelIds,
		storage: storageProp,
		...identity
	} = options;
	const id = 'id' in identity ? identity.id : identity.groupId;
	const hasPanelIds = panelIds !== undefined;
	const panelIdsKey = panelIds?.join(':') ?? '';
	const [defaultLayout, setDefaultLayout] = useState<Layout | undefined>(undefined, subSlot(slot, 'default-layout'));
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null, subSlot(slot, 'timeout'));
	const storageRef = useRef<LayoutStorage | undefined>(storageProp, subSlot(slot, 'storage'));
	storageRef.current = storageProp;

	const clearPendingTimeout = useCallback(() => {
		if (timeoutRef.current !== null) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
	}, [], subSlot(slot, 'clear-timeout'));

	useEffect(() => {
		try {
			const storage = storageProp ?? globalThis.localStorage;
			storageRef.current = storage;
			const modern = readModernLayout(storage.getItem(getStorageKey(id, panelIds ?? [])));
			setDefaultLayout(modern ?? readLegacyLayout({ id, panelIds, storage }));
		} catch {
			storageRef.current = undefined;
			setDefaultLayout(undefined);
		}
	}, [id, panelIdsKey, storageProp], subSlot(slot, 'restore-effect'));

	useEffect(() => clearPendingTimeout, [clearPendingTimeout], subSlot(slot, 'cleanup-effect'));

	const onLayoutChanged = useCallback<(layout: Layout, meta: LayoutChangedMeta) => void>(
		(layout: Layout, meta: LayoutChangedMeta) => {
			if (onlySaveAfterUserInteractions && !meta.isUserInteraction) return;
			clearPendingTimeout();

			const storage = storageRef.current;
			if (!storage) return;
			const key = getStorageKey(id, hasPanelIds ? Object.keys(layout) : []);
			try {
				storage.setItem(key, JSON.stringify(layout));
			} catch (error) {
				console.error(error);
			}
		},
		[clearPendingTimeout, hasPanelIds, id, onlySaveAfterUserInteractions],
		subSlot(slot, 'layout-changed'),
	);

	const onLayoutChange = useCallback<(layout: Layout) => void>(
		(layout: Layout) => {
			clearPendingTimeout();
			if (debounceSaveMs === 0) {
				onLayoutChanged(layout, { isUserInteraction: false });
			} else {
				timeoutRef.current = setTimeout(
					() => onLayoutChanged(layout, { isUserInteraction: false }),
					debounceSaveMs,
				);
			}
		},
		[clearPendingTimeout, debounceSaveMs, onLayoutChanged],
		subSlot(slot, 'layout-change'),
	);

	return { defaultLayout, onLayoutChange, onLayoutChanged };
}

function readModernLayout(value: string | null): Layout | undefined {
	if (!value) return undefined;
	try {
		const parsed: unknown = JSON.parse(value);
		if (
			parsed !== null &&
			typeof parsed === 'object' &&
			!Array.isArray(parsed) &&
			Object.values(parsed).every((item) => typeof item === 'number')
		) {
			return parsed as Layout;
		}
	} catch {
		// Malformed modern records fall through to the legacy reader.
	}
	return undefined;
}
