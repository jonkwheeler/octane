import { QueryClientProvider } from '@octanejs/tanstack-query';
import type { Query } from '@tanstack/query-core';
import { useRequestQuery } from '../../src/query';
import type { RequestSource } from '../../src/query';

type Enabled = boolean | ((query: Query<string, Error, string, readonly unknown[]>) => boolean);

export function RequestReader(props: {
	source: RequestSource<string> | null;
	enabled?: Enabled;
	onEnabledQuery?: (query: Query<string, Error, string, readonly unknown[]>) => void;
}) @{
	const enabled =
		typeof props.enabled === 'function'
			? (query: Query<string, Error, string, readonly unknown[]>) => {
					props.onEnabledQuery?.(query);
					return props.enabled!(query);
				}
			: props.enabled;
	const query = useRequestQuery(['request'], props.source, { enabled, retry: false });
	<span id="status">{(query.isPending ? 'pending' : `data:${query.data}`) as string}</span>
}

export function RequestApp(props: {
	client: unknown;
	source: RequestSource<string> | null;
	enabled?: Enabled;
	onEnabledQuery?: (query: Query<string, Error, string, readonly unknown[]>) => void;
}) @{
	<QueryClientProvider client={props.client}>
		<RequestReader
			source={props.source}
			enabled={props.enabled}
			onEnabledQuery={props.onEnabledQuery}
		/>
	</QueryClientProvider>
}
