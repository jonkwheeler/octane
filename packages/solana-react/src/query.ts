import { useQuery } from '@octanejs/tanstack-query';
import type { UseQueryOptions, UseQueryResult } from '@octanejs/tanstack-query';
import { skipToken, type QueryKey } from '@tanstack/query-core';
import { useCallback, useRef } from 'octane';

const subCache = new Map<symbol, Map<string, symbol>>();
function sub(slot: symbol | undefined, tag: string): symbol | undefined {
	if (slot === undefined) return undefined;
	let byTag = subCache.get(slot);
	if (byTag === undefined) subCache.set(slot, (byTag = new Map()));
	let symbol = byTag.get(tag);
	if (symbol === undefined) {
		symbol = Symbol.for(`${slot.description ?? ''}:request-query:${tag}`);
		byTag.set(tag, symbol);
	}
	return symbol;
}

export type RequestSource<T> =
	| ((signal: AbortSignal) => Promise<T>)
	| { send(options?: { abortSignal?: AbortSignal }): Promise<T> };

export function useRequestQuery<T, TError = Error, TData = T>(
	key: QueryKey,
	source: RequestSource<T> | null,
	options?: Omit<UseQueryOptions<T, TError, TData, QueryKey>, 'queryFn' | 'queryKey'>,
): UseQueryResult<TData, TError>;
export function useRequestQuery(
	key: QueryKey,
	source: RequestSource<unknown> | null,
	optionsOrSlot?:
		Omit<UseQueryOptions<unknown, Error, unknown, QueryKey>, 'queryFn' | 'queryKey'> | symbol,
	slot?: symbol,
) {
	const options = typeof optionsOrSlot === 'symbol' ? undefined : optionsOrSlot;
	const resolvedSlot = typeof optionsOrSlot === 'symbol' ? optionsOrSlot : slot;

	const result = (useQuery as (...args: unknown[]) => UseQueryResult<unknown, Error>)(
		{
			...options,
			enabled: source === null ? false : options?.enabled,
			queryKey: key,
			queryFn:
				source === null
					? skipToken
					: ({ signal }: { signal: AbortSignal }) =>
							typeof source === 'function' ? source(signal) : source.send({ abortSignal: signal }),
		},
		undefined,
		resolvedSlot,
	);
	const resultRef = useRef(result, sub(resolvedSlot, 'result'));
	resultRef.current = result;
	const idleRefetch = useCallback(
		async () => resultRef.current,
		[],
		sub(resolvedSlot, 'idle-refetch'),
	);
	const idleResultRef = useRef<UseQueryResult<unknown, Error> | undefined>(
		undefined,
		sub(resolvedSlot, 'idle-result'),
	);
	const trackedResultRef = useRef(result, sub(resolvedSlot, 'tracked-result'));
	if (source === null) {
		let idle = idleResultRef.current;
		if (idle === undefined) {
			idleResultRef.current = idle = {
				...result,
				refetch: idleRefetch,
			};
			trackedResultRef.current = result;
		} else if (trackedResultRef.current !== result) {
			Object.assign(idle, result);
			idle.refetch = idleRefetch;
			trackedResultRef.current = result;
		}
		return idle;
	}
	return result;
}
