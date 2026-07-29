import { useQuery } from '@octanejs/tanstack-query';
import type { UseQueryOptions, UseQueryResult } from '@octanejs/tanstack-query';
import type { QueryKey } from '@tanstack/query-core';

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
	options?: object,
	slot?: symbol,
) {
	return (useQuery as (...args: unknown[]) => unknown)(
		{
			...options,
			enabled: source !== null && (options as { enabled?: boolean } | undefined)?.enabled !== false,
			queryKey: key,
			queryFn: ({ signal }: { signal: AbortSignal }) =>
				typeof source === 'function' ? source(signal) : source!.send({ abortSignal: signal }),
		},
		undefined,
		slot,
	);
}
