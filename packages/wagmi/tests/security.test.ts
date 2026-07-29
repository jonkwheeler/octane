import { describe, expect, it } from 'vitest';
import {
	LiveConnectionRequiredError,
	ActionContextChangedError,
	HYDRATION_VERSION,
	MAX_HYDRATION_BYTES,
	parseHydratedState,
	serializeHydratedState,
	secureMutationOptions,
} from '@octanejs/wagmi';
import { connect, createConfig, disconnect, http } from '@wagmi/core';
import { mock } from '@wagmi/connectors/mock';
import { mainnet } from 'viem/chains';

describe('hydration security boundary', () => {
	it('fails closed for malformed, unknown-version, and oversized hints', () => {
		expect(parseHydratedState('{')).toBeUndefined();
		expect(parseHydratedState(JSON.stringify({ version: 999, state: {} }))).toBeUndefined();
		expect(parseHydratedState('x'.repeat(MAX_HYDRATION_BYTES + 1))).toBeUndefined();
	});

	it('accepts only the versioned public state snapshot', () => {
		const state = {
			chainId: 1,
			connections: new Map(),
			current: null,
			status: 'disconnected',
		} as any;
		const value = serializeHydratedState(state);
		expect(value).toBeTypeOf('string');
		expect(JSON.parse(value!).version).toBe(HYDRATION_VERSION);
		expect(parseHydratedState(value!)).toMatchObject({
			chainId: 1,
			status: 'disconnected',
		});
	});

	it('rejects privileged material even inside an otherwise shaped hint', () => {
		const value = JSON.stringify({
			version: HYDRATION_VERSION,
			state: {
				chainId: 1,
				connections: [],
				current: null,
				status: 'connected',
				signature: '0xsecret',
			},
		});
		expect(parseHydratedState(value)).toBeUndefined();
	});

	it('never retries or dispatches a privileged action from a disconnected hint', async () => {
		const config = createConfig({
			chains: [mainnet],
			connectors: [mock({ accounts: ['0x0000000000000000000000000000000000000001'] })],
			transports: { [mainnet.id]: http() },
		});
		let dispatched = false;
		const options = secureMutationOptions(config, {
			retry: 5,
			mutationFn: async () => {
				dispatched = true;
			},
		});
		expect(options.retry).toBe(false);
		await expect(options.mutationFn(undefined)).rejects.toBeInstanceOf(LiveConnectionRequiredError);
		expect(dispatched).toBe(false);
	});

	it('cancels before dispatch when the displayed wallet context was replaced', async () => {
		const config = createConfig({
			chains: [mainnet],
			connectors: [mock({ accounts: ['0x0000000000000000000000000000000000000001'] })],
			transports: { [mainnet.id]: http() },
		});
		let dispatched = false;
		const options = secureMutationOptions(config, {
			mutationFn: async () => {
				dispatched = true;
				return '0xsignature';
			},
		});
		await connect(config, { connector: config.connectors[0]! });

		await expect(options.mutationFn(undefined)).rejects.toMatchObject({
			name: 'ActionContextChangedError',
			phase: 'before-dispatch',
		});
		expect(dispatched).toBe(false);
	});

	it('quarantines a late result when wallet context changes after dispatch', async () => {
		const config = createConfig({
			chains: [mainnet],
			connectors: [mock({ accounts: ['0x0000000000000000000000000000000000000001'] })],
			transports: { [mainnet.id]: http() },
		});
		await connect(config, { connector: config.connectors[0]! });
		let release!: () => void;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		let started!: () => void;
		const dispatched = new Promise<void>((resolve) => {
			started = resolve;
		});
		const options = secureMutationOptions(config, {
			mutationFn: async () => {
				started();
				await gate;
				return '0xlate-signature';
			},
		});

		const result = options.mutationFn(undefined);
		await dispatched;
		await disconnect(config);
		release();

		const error = await result.catch((caught: unknown) => caught);
		expect(error).toBeInstanceOf(ActionContextChangedError);
		expect(error).toMatchObject({
			phase: 'after-dispatch',
			quarantinedResult: '0xlate-signature',
		});
	});
});
