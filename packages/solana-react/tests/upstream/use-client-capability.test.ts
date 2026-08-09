import { createClient } from '@solana/kit';
import { describe, expect, it, vi } from 'vitest';
import { flushEffects, mount } from '../../../octane/tests/_helpers';
import { CapabilityApp } from '../_fixtures/upstream/use-client-capability.tsrx';

type ClientWithFoo = { foo: { hello(): string } };

describe('useClientCapability', () => {
	// Per upstream/src/__tests__/useClientCapability-test.browser.tsx:21.
	it('returns the client when the capability is present', () => {
		const client = createClient<ClientWithFoo>({ foo: { hello: () => 'world' } });
		const onRender = vi.fn();
		const result = mount(CapabilityApp, {
			client,
			capability: 'foo',
			hookName: 'useFoo',
			providerHint: 'Install fooPlugin().',
			onRender,
		});
		flushEffects();
		expect(onRender).toHaveBeenCalledWith(client);
		result.unmount();
	});

	// Per upstream/src/__tests__/useClientCapability-test.browser.tsx:35.
	// OCTANE DIVERGENCE[solana-react-capability-error][runtime:d19263abe251ae27]
	it('throws with hookName + providerHint when the capability is absent', () => {
		const client = createClient();
		expect(function missingCapability() {
			mount(CapabilityApp, {
				client,
				capability: 'foo',
				hookName: 'useFoo',
				providerHint: 'Install fooPlugin().',
				onRender: function onRender() {},
			});
		}).toThrow('useFoo requires client capability "foo". Install fooPlugin().');
	});

	// Per upstream/src/__tests__/useClientCapability-test.browser.tsx:60.
	// OCTANE DIVERGENCE[solana-react-capability-error][runtime:ad59fa9b59c507a2]
	it('reports the first missing entry when capability is an array', () => {
		const client = createClient<{ rpc: object }>({ rpc: {} });
		expect(function missingSubscription() {
			mount(CapabilityApp, {
				client,
				capability: ['rpc', 'rpcSubscriptions'],
				hookName: 'useLiveData',
				providerHint: 'Install solanaRpcConnection().',
				onRender: function onRender() {},
			});
		}).toThrow(
			'useLiveData requires client capability "rpcSubscriptions". Install solanaRpcConnection().',
		);
	});
});
