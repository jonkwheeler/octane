import { useQuery } from '@octanejs/tanstack-query';
import type { UseQueryOptions, UseQueryResult } from '@octanejs/tanstack-query';
import { skipToken, type QueryKey } from '@tanstack/query-core';

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
			queryFn: source === null
				? skipToken
				: ({ signal }: { signal: AbortSignal }) =>
						typeof source === 'function'
							? source(signal)
							: source.send({ abortSignal: signal }),
		},
		undefined,
		resolvedSlot,
	);
	return source === null
		? {
				...result,
				refetch: async () => result,
			}
		: result;
}
