import { afterEach, describe, expect, it } from 'vitest';
import { createConfig, http } from '@wagmi/core';
import { mock } from '@wagmi/connectors/mock';
import { mainnet } from 'viem/chains';
import { QueryClient } from '@octanejs/tanstack-query';
import { act } from 'octane';
import { flushEffects, mount } from '../../octane/tests/_helpers';
import { App, OutsideProvider } from './_fixtures/app.tsrx';

const account = '0x0000000000000000000000000000000000000001' as const;
let mounted: ReturnType<typeof mount> | undefined;

function setup() {
	const config = createConfig({
		chains: [mainnet],
		connectors: [mock({ accounts: [account] })],
		transports: { [mainnet.id]: http() },
	});
	mounted = mount(App, {
		config,
		queryClient: new QueryClient({ defaultOptions: { mutations: { retry: false } } }),
	});
	flushEffects();
	return config;
}

afterEach(() => {
	mounted?.unmount();
	mounted = undefined;
	document.body.style.overflow = '';
});

describe('RainbowKit Wagmi v3 compatibility gate', () => {
	it('moves custom controls from disconnected through modal-open to connected', async () => {
		setup();
		expect(mounted!.find('#custom-status').textContent).toBe('disconnected');
		mounted!.click('#custom-connect');
		flushEffects();
		expect(mounted!.find('#custom-status').textContent).toBe('modal-open');
		expect(document.querySelector('[role="dialog"]')?.getAttribute('aria-modal')).toBe('true');

		(document.querySelector('.rk-action') as HTMLButtonElement).click();
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		expect(mounted!.find('#custom-status').textContent).toBe('connected');
		expect(document.querySelector('[role="dialog"]')).toBeNull();
	});

	it('dismisses with Escape, restores focus, and releases scroll containment', async () => {
		setup();
		const opener = mounted!.find('#custom-connect') as HTMLButtonElement;
		opener.focus();
		mounted!.click('#custom-connect');
		flushEffects();
		expect(document.body.style.overflow).toBe('hidden');
		expect(document.activeElement?.getAttribute('aria-label')).toBe('Close');
		expect(opener.closest('[aria-hidden="true"]')).not.toBeNull();

		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		flushEffects();
		await Promise.resolve();
		expect(document.querySelector('[role="dialog"]')).toBeNull();
		expect(document.body.style.overflow).toBe('');
		expect(document.activeElement).toBe(opener);
		expect(opener.closest('[aria-hidden="true"]')).toBeNull();
	});

	it('keeps modal hooks inert outside RainbowKitProvider', () => {
		mounted = mount(OutsideProvider);
		expect(mounted.find('#outside').textContent).toBe('true');
	});
});
