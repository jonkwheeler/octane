import { gql } from '@apollo/client';
import { ApolloProvider, useQuery } from '@octanejs/apollo-client/react';

export const QUERY = gql`
	query DifferentialValue {
		value
	}
`;

function QueryPanel() @{
	const result = useQuery(QUERY, { fetchPolicy: 'cache-only' });
	<output id="query-value">
		{result.loading ? 'loading' : 'data:' + ((result.data as any)?.value ?? '-')}
	</output>
}

export function QueryDiff(props: { client: any }) @{
	<ApolloProvider client={props.client}>
		<QueryPanel />
	</ApolloProvider>
}
