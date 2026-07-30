import { useEffect, useMemo, useRef } from 'octane';
import { splitSlot, subSlot } from './internal';

type Entry = { _tag: 'active'; rc: number; resource: unknown } | { _tag: 'destroyed' };
type Bucket = Map<string, Entry>;

let scopedBuckets = new WeakMap<object, Bucket>();

const getBucket = (scope: object): Bucket => {
	let bucket = scopedBuckets.get(scope);
	if (bucket === undefined) {
		bucket = new Map();
		scopedBuckets.set(scope, bucket);
	}
	return bucket;
};

export function useRcResource<T>(
	scope: object,
	key: string,
	create: () => T,
	dispose: (resource: NoInfer<T>) => void,
	options?: { debugPrint?: (resource: NoInfer<T>) => ReadonlyArray<unknown> },
): T;
export function useRcResource<T>(
	scope: object,
	key: string,
	create: () => T,
	dispose: (resource: NoInfer<T>) => void,
	options: { debugPrint?: (resource: NoInfer<T>) => ReadonlyArray<unknown> } | undefined,
	slot: symbol,
): T;
export function useRcResource<T>(
	scope: object,
	key: string,
	create: () => T,
	dispose: (resource: NoInfer<T>) => void,
	...rest: [
		options?: { debugPrint?: (resource: NoInfer<T>) => ReadonlyArray<unknown> },
		slot?: symbol,
	]
): T {
	const [args, slot] = splitSlot(rest);
	void args[0];

	const keyRef = useRef<string | undefined>(undefined, subSlot(slot, 'rc:key'));
	const scopeRef = useRef<object | undefined>(undefined, subSlot(slot, 'rc:scope'));
	const didDisposeInMemo = useRef(false, subSlot(slot, 'rc:disposed'));
	const createRef = useRef(create, subSlot(slot, 'rc:create'));
	const disposeRef = useRef(dispose, subSlot(slot, 'rc:dispose'));

	createRef.current = create;
	disposeRef.current = dispose;

	const resource = useMemo(
		() => {
			const bucket = getBucket(scope);
			if (didDisposeInMemo.current === true) {
				const cachedItem = bucket.get(key);
				if (cachedItem?._tag === 'active') return cachedItem.resource as T;
			}

			if (keyRef.current !== undefined && (keyRef.current !== key || scopeRef.current !== scope)) {
				const previousBucket = getBucket(scopeRef.current!);
				const previous = previousBucket.get(keyRef.current);
				if (previous?._tag === 'active') {
					previous.rc--;
					if (previous.rc === 0) {
						disposeRef.current(previous.resource as T);
						previousBucket.set(keyRef.current, { _tag: 'destroyed' });
						didDisposeInMemo.current = true;
					}
				}
			}

			const cachedItem = bucket.get(key);
			if (cachedItem?._tag === 'active') {
				cachedItem.rc++;
				return cachedItem.resource as T;
			}

			const next = createRef.current();
			bucket.set(key, { _tag: 'active', rc: 1, resource: next });
			return next;
		},
		[scope, key],
		subSlot(slot, 'rc:memo'),
	);

	useEffect(
		() => {
			return () => {
				if (didDisposeInMemo.current === true) {
					didDisposeInMemo.current = false;
					return;
				}

				const bucket = getBucket(scope);
				const cachedItem = bucket.get(key);
				if (cachedItem?._tag !== 'active') return;
				cachedItem.rc--;
				if (cachedItem.rc === 0) {
					disposeRef.current(cachedItem.resource as T);
					bucket.delete(key);
				}
			};
		},
		[scope, key],
		subSlot(slot, 'rc:effect'),
	);

	keyRef.current = key;
	scopeRef.current = scope;
	return resource;
}

export const __resetUseRcResourceCache = (): void => {
	scopedBuckets = new WeakMap();
};
