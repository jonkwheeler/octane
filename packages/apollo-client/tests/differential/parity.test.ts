import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client';
import { resolve } from 'node:path';
import { describe, it } from 'vitest';
import { mountDifferential } from '../../../octane/tests/differential/_rig.js';
import { QUERY } from '../_fixtures/query-diff.tsrx';

const FIXTURE = resolve(__dirname, '../_fixtures/query-diff.tsrx');
const CACHE = resolve(__dirname, '.react-cache');

describe('differential: @octanejs/apollo-client vs @apollo/client/react', () => {
	// @parity-case differential:apollo-cache-query
	it('ApolloProvider and cache-only useQuery render byte-identical data', async () => {
		const client = new ApolloClient({ cache: new InMemoryCache(), link: ApolloLink.empty() });
		client.writeQuery({ query: QUERY, data: { value: 'cached' } });
		const differential = await mountDifferential(FIXTURE, 'QueryDiff', { client }, CACHE);
		await differential.step('mount', () => {});
		differential.unmount();
		client.stop();
	});
});
