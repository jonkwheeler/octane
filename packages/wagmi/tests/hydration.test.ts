import { describe, expect, it } from 'vitest';
import { connect, createConfig, getConnection, http, hydrate } from '@wagmi/core';
import { mock } from '@wagmi/connectors/mock';
import { mainnet } from 'viem/chains';

const account = '0x0000000000000000000000000000000000000001' as const;

function config() {
	return createConfig({
		chains: [mainnet],
		connectors: [mock({ accounts: [account] })],
		ssr: true,
		transports: { [mainnet.id]: http() },
	});
}

describe('SSR initial state', () => {
	it('installs the connected snapshot before mount without a disconnected intermediate state', async () => {
		const server = config();
		await connect(server, { connector: server.connectors[0]! });
		const initialState = server.state;

		const client = config();
		const statuses: string[] = [];
		const unsubscribe = client.subscribe(
			(state) => state.status,
			(status) => statuses.push(status),
		);
		const { onMount } = hydrate(client, {
			initialState,
			reconnectOnMount: true,
		});

		expect(getConnection(client)).toMatchObject({
			address: account,
			chainId: mainnet.id,
			status: 'reconnecting',
		});
		expect(statuses).toEqual(['reconnecting']);
		await onMount();
		expect(statuses).not.toContain('disconnected');
		unsubscribe();
	});
});
