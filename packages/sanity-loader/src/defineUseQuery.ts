import type { QueryParams } from '@sanity/client';
import type { QueryStore, QueryStoreState } from '@sanity/core-loader';
import type { EncodeDataAttributeFunction } from '@sanity/core-loader/encode-data-attribute';
import isEqual from 'fast-deep-equal';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'octane';

import { defineStudioUrlStore } from './defineStudioUrlStore';
import type { UseQueryOptions } from './types';
import { useEncodeDataAttribute } from './useEncodeDataAttribute';

export function defineUseQuery({
	createFetcherStore,
	studioUrlStore,
}: Pick<QueryStore, 'createFetcherStore'> & {
	studioUrlStore: ReturnType<typeof defineStudioUrlStore>;
}): <QueryResponseResult, QueryResponseError>(
	query: string,
	params?: QueryParams,
	options?: UseQueryOptions<QueryResponseResult>,
) => QueryStoreState<QueryResponseResult, QueryResponseError> & {
	encodeDataAttribute: EncodeDataAttributeFunction;
} {
	const DEFAULT_PARAMS = {};

	return <QueryResponseResult, QueryResponseError>(
		query: string,
		params: QueryParams = DEFAULT_PARAMS,
		options: UseQueryOptions<QueryResponseResult> = {},
	) => {
		const initial = useMemo(
			() =>
				options.initial
					? { perspective: 'published' as const, variant: undefined, ...options.initial }
					: undefined,
			[options.initial],
		);
		const serializedParams = useMemo(() => JSON.stringify(params), [params]);

		const [snapshot, setSnapshot] = useState<
			QueryStoreState<QueryResponseResult, QueryResponseError>
		>(() => {
			const fetcher = createFetcherStore<QueryResponseResult, QueryResponseError>(
				query,
				JSON.parse(serializedParams),
				initial,
			);
			return fetcher.value!;
		});

		useEffect(() => {
			const fetcher = createFetcherStore<QueryResponseResult, QueryResponseError>(
				query,
				JSON.parse(serializedParams),
				initial,
			);
			return fetcher.subscribe((nextSnapshot) => {
				setSnapshot((previous) => {
					if (!isEqual(previous.sourceMap, nextSnapshot.sourceMap)) return nextSnapshot;
					if (!isEqual(previous.data, nextSnapshot.data)) return nextSnapshot;
					if (previous.error !== nextSnapshot.error) return nextSnapshot;
					if (previous.loading !== nextSnapshot.loading) return nextSnapshot;
					if (previous.perspective !== nextSnapshot.perspective) return nextSnapshot;
					if (previous.variant !== nextSnapshot.variant) return nextSnapshot;
					return previous;
				});
			});
		}, [serializedParams, initial, query]);

		const studioUrl = useSyncExternalStore(
			studioUrlStore.subscribe,
			studioUrlStore.getSnapshot,
			studioUrlStore.getServerSnapshot,
		);
		const encodeDataAttribute = useEncodeDataAttribute(
			snapshot.data,
			snapshot.sourceMap,
			studioUrl,
		);

		return useMemo(() => ({ ...snapshot, encodeDataAttribute }), [snapshot, encodeDataAttribute]);
	};
}
