import { afterEach, describe, expect, it, vi } from 'vitest';
import { connect, createConfig } from '@wagmi/core';
import { mock } from '@wagmi/connectors/mock';
import { custom } from 'viem';
import { mainnet } from 'viem/chains';
import { QueryClient } from '@octanejs/tanstack-query';
import { act } from 'octane';
import { mount, flushEffects } from '../../octane/tests/_helpers';
import { BalanceApp, SignApp } from './_fixtures/actions.tsrx';

const account = '0x0000000000000000000000000000000000000001' as const;
let mounted: ReturnType<typeof mount> | undefined;

afterEach(() => {
	mounted?.unmount();
	mounted = undefined;
	vi.unstubAllGlobals();
});

function queryClient() {
	return new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
}

describe('representative query and privileged action integration', () => {
	it('shares one balance request across two consumers', async () => {
		let balanceRequests = 0;
		const testChain = { ...mainnet, contracts: undefined };
		const config = createConfig({
			chains: [testChain],
			transports: {
				[testChain.id]: custom({
					async request({ method }) {
						if (method === 'eth_getBalance') {
							balanceRequests++;
							return '0x2a';
						}
						if (method === 'eth_chainId') return '0x1';
						throw new Error(`unexpected RPC method ${method}`);
					},
				}),
			},
		});
		mounted = mount(BalanceApp, { address: account, config, queryClient: queryClient() });
		flushEffects();
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 20));
		});

		if (mounted.find('#first').textContent === 'error')
			throw new Error(mounted.find('#balance-error').textContent ?? 'unknown balance error');
		expect(mounted.find('#first').textContent).toBe('42');
		expect(mounted.find('#second').textContent).toBe('42');
		expect(balanceRequests).toBe(1);
	});

	it('signs once through the live deterministic connector', async () => {
		const signature = `0x${'11'.repeat(65)}`;
		vi.stubGlobal(
			'fetch',
			vi.fn(async (_input: unknown, init?: RequestInit) => {
				const body = JSON.parse(String(init?.body)) as { id: number };
				return new Response(JSON.stringify({ jsonrpc: '2.0', id: body.id, result: signature }), {
					headers: { 'content-type': 'application/json' },
				});
			}),
		);
		const config = createConfig({
			chains: [mainnet],
			connectors: [mock({ accounts: [account] })],
			storage: null,
			transports: { [mainnet.id]: custom({ request: async () => '0x1' }) },
		});
		await connect(config, { connector: config.connectors[0]! });
		mounted = mount(SignApp, { config, queryClient: queryClient() });
		flushEffects();
		mounted.click('#sign');
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 20));
		});
		expect(mounted.find('#sign-status').textContent).toBe('success');
		expect(mounted.find('#signature').textContent).toBe(signature);
		expect(mounted.find('#sign-error').textContent).toBe('-');
	});

	it('surfaces connector signing failure without retrying', async () => {
		const config = createConfig({
			chains: [mainnet],
			connectors: [mock({ accounts: [account], features: { signMessageError: true } })],
			storage: null,
			transports: { [mainnet.id]: custom({ request: async () => '0x1' }) },
		});
		await connect(config, { connector: config.connectors[0]! });
		mounted = mount(SignApp, { config, queryClient: queryClient() });
		flushEffects();
		mounted.click('#sign');
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		expect(mounted.find('#sign-status').textContent).toBe('error');
		expect(mounted.find('#sign-error').textContent).not.toBe('-');
	});
});
