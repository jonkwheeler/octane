import { createClient } from '@solana/kit';
import { describe, expect, it, vi } from 'vitest';
import { flushEffects, mount } from '../../../octane/tests/_helpers';
import { useClient } from '../../src/hooks/useClient';
import { NestedClientProbes, SingleClientProbe } from '../_fixtures/upstream/client-provider.tsrx';

describe('ClientProvider + useClient', () => {
	// Per upstream/src/__tests__/ClientProvider-test.browser.tsx:11.
	it('publishes the client to descendants and returns the same reference across renders', () => {
		const client = createClient();
		const seen: Array<ReturnType<typeof createClient>> = [];
		const result = mount(SingleClientProbe, {
			client,
			onRender: function onRender(value) {
				seen.push(value);
			},
		});
		flushEffects();
		expect(seen[0]).toBe(client);
		result.update(SingleClientProbe, {
			client,
			onRender: function onRender(value) {
				seen.push(value);
			},
		});
		flushEffects();
		expect(seen.at(-1)).toBe(client);
		result.unmount();
	});

	// Per upstream/src/__tests__/ClientProvider-test.browser.tsx:22.
	// OCTANE DIVERGENCE[solana-react-missing-provider-error][runtime:081816f027c70cc0]
	it('throws when `useClient` is called outside a provider', () => {
		function OutsideProvider() {
			useClient();
			return null;
		}
		expect(function callOutsideProvider() {
			mount(OutsideProvider as never);
		}).toThrow('useClient must be used inside ClientProvider');
	});

	// Per upstream/src/__tests__/ClientProvider-test.browser.tsx:34.
	it('lets the nearest provider win for nested mounts', () => {
		const outer = createClient();
		const inner = createClient();
		const onRenderOuter = vi.fn();
		const onRenderInner = vi.fn();
		const result = mount(NestedClientProbes, {
			outer,
			inner,
			onRenderOuter,
			onRenderInner,
		});
		flushEffects();
		expect(onRenderOuter).toHaveBeenCalledWith(outer);
		expect(onRenderOuter).not.toHaveBeenCalledWith(inner);
		expect(onRenderInner).toHaveBeenCalledWith(inner);
		expect(onRenderInner).not.toHaveBeenCalledWith(outer);
		result.unmount();
	});
});
