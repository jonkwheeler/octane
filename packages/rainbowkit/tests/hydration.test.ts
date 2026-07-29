import { describe, expect, it, vi } from 'vitest';
import { createConfig, http } from '@wagmi/core';
import { mock } from '@wagmi/connectors/mock';
import { mainnet } from 'viem/chains';
import { QueryClient } from '@octanejs/tanstack-query';
import { flushSync, hydrateRoot } from 'octane';
import { flushEffects } from '../../octane/tests/_helpers';
import { renderHydrationFixture } from '../../octane/tests/_hydration-ssr';
import { App } from './_fixtures/app.tsrx';

async function settle(): Promise<void> {
	flushEffects();
	flushSync(() => {});
	await Promise.resolve();
	flushEffects();
}

describe('@octanejs/rainbowkit hydration', () => {
	it('adopts disconnected SSR controls, flips mounted, and opens the live modal', async () => {
		const config = createConfig({
			chains: [mainnet],
			connectors: [mock({ accounts: ['0x0000000000000000000000000000000000000001'] })],
			ssr: true,
			transports: { [mainnet.id]: http() },
		});
		const queryClient = new QueryClient();
		const server = await renderHydrationFixture(
			'rainbowkit',
			'packages/rainbowkit/tests/_fixtures/app.tsrx',
			'App',
			{ config, queryClient },
		);
		const container = document.createElement('div');
		container.innerHTML = server.html;
		document.body.appendChild(container);
		const button = container.querySelector('#custom-connect');
		const mounted = container.querySelector('#mounted');
		const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
		const root = hydrateRoot(container, App, { config, queryClient });
		try {
			await settle();
			expect(container.querySelector('#custom-connect')).toBe(button);
			expect(container.querySelector('#mounted')).toBe(mounted);
			expect(mounted?.textContent).toBe('true');
			(button as HTMLButtonElement).click();
			await settle();
			expect(container.querySelector('[role="dialog"]')).not.toBeNull();
			expect(errors).not.toHaveBeenCalled();
		} finally {
			root.unmount();
			errors.mockRestore();
			container.remove();
		}
	});
});
