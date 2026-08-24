import { createQueryStore } from '@octanejs/sanity-loader';

const { useQuery } = createQueryStore({ client: false, ssr: true });
const query = '*[_type == "post"][0]';

export function InitialQuery() @{
	const { data, loading } = useQuery<{ title: string }>(query, {}, {
		initial: {
			data: { title: 'Octane and Sanity' },
			sourceMap: undefined,
		},
	});

	<output data-loading={loading ? 'true' : 'false'}>{data.title as string}</output>
}
