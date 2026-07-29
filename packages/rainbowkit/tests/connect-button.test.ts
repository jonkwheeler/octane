import { afterEach, describe, expect, it } from 'vitest';
import { createConfig, http } from '@wagmi/core';
import { mock } from '@wagmi/connectors/mock';
import { mainnet, sepolia } from 'viem/chains';
import { QueryClient } from '@octanejs/tanstack-query';
import { act, createRoot, flushSync } from 'octane';
import { flushEffects, mount } from '../../octane/tests/_helpers';
import type { WalletDescriptor } from '@octanejs/rainbowkit';
import { darkTheme } from '@octanejs/rainbowkit';
import {
	App,
	OutsideProvider,
	ProgrammaticProvider,
	TwoProviders,
	latestWalletConnect,
} from './_fixtures/app.tsrx';

const account = '0x0000000000000000000000000000000000000001' as const;
let mounted: ReturnType<typeof mount> | undefined;

function setup(wallets?: readonly WalletDescriptor[]) {
	const config = createConfig({
		chains: [mainnet],
		connectors: [mock({ accounts: [account] })],
		transports: { [mainnet.id]: http() },
	});
	mounted = mount(App, {
		config,
		queryClient: new QueryClient({ defaultOptions: { mutations: { retry: false } } }),
		wallets,
	});
	flushEffects();
	flushSync(() => {});
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
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		flushEffects();
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
		expect(mounted!.find('#outside-provider').closest('[aria-hidden="true"]')).not.toBeNull();

		act(() => {
			document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		});
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

	it('connects through WalletButton and renders connected account controls', async () => {
		setup();
		(document.querySelector('.rk-wallet-button') as HTMLButtonElement).click();
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0));
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		expect(mounted!.find('#custom-status').textContent).toBe('connected');
		expect(document.querySelector('[data-rk]')?.textContent).toContain('0x0000…0001');
		expect(document.querySelector('[data-rk]')?.textContent).toContain('Ethereum');
		expect(document.querySelector('[data-rk]')?.textContent).toContain('Disconnect');
	});

	it('disconnects from the account modal and keeps failures actionable', async () => {
		const config = setup();
		(document.querySelector('.rk-wallet-button') as HTMLButtonElement).click();
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		const connector = config.connectors[0]!;
		const disconnect = connector.disconnect?.bind(connector);
		connector.disconnect = async () => {
			throw new Error('Wallet refused disconnect');
		};
		const accountButton = Array.from(
			document.querySelectorAll<HTMLButtonElement>('.rk-connect-button'),
		).find((button) => button.textContent?.includes('0x0000'))!;
		accountButton.click();
		flushEffects();
		(document.querySelector('.rk-dialog .rk-action') as HTMLButtonElement).click();
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		expect(document.querySelector('[role="alert"]')?.textContent).toContain(
			'Wallet refused disconnect',
		);
		expect(document.querySelector('[role="dialog"]')).not.toBeNull();
		connector.disconnect = disconnect;
		(document.querySelector('.rk-dialog .rk-action') as HTMLButtonElement).click();
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0));
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		flushEffects();
		expect(document.querySelector('[role="dialog"]')).toBeNull();
	});

	it('switches chains from the chain modal and reports a rejected switch', async () => {
		const config = createConfig({
			chains: [mainnet, sepolia],
			connectors: [mock({ accounts: [account] })],
			transports: { [mainnet.id]: http(), [sepolia.id]: http() },
		});
		mounted = mount(App, {
			config,
			queryClient: new QueryClient({ defaultOptions: { mutations: { retry: false } } }),
		});
		flushEffects();
		flushSync(() => {});
		(document.querySelector('.rk-wallet-button') as HTMLButtonElement).click();
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0));
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		flushEffects();
		flushSync(() => {});
		const chainButton = Array.from(
			document.querySelectorAll<HTMLButtonElement>('.rk-connect-button'),
		).find((button) => button.textContent?.includes('Ethereum'))!;
		chainButton.click();
		flushEffects();
		const sepoliaButton = Array.from(
			document.querySelectorAll<HTMLButtonElement>('.rk-dialog .rk-action'),
		).find((button) => button.textContent?.includes('Sepolia'))!;
		sepoliaButton.click();
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		expect(document.querySelector('[role="dialog"]')).toBeNull();
		expect(document.querySelector('[data-rk]')?.textContent).toContain('Sepolia');

		const connector = config.connectors[0]!;
		connector.switchChain = async () => {
			throw new Error('Switch rejected');
		};
		const currentChainButton = Array.from(
			document.querySelectorAll<HTMLButtonElement>('.rk-connect-button'),
		).find((button) => button.textContent?.includes('Sepolia'))!;
		currentChainButton.click();
		flushEffects();
		const mainnetButton = Array.from(
			document.querySelectorAll<HTMLButtonElement>('.rk-dialog .rk-action'),
		).find((button) => button.textContent?.includes('Ethereum'))!;
		mainnetButton.click();
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		expect(document.querySelector('[role="alert"]')?.textContent).toContain('Switch rejected');
		expect(document.querySelector('[role="dialog"]')).not.toBeNull();
	});

	it('dismisses only from the overlay and restores all isolation on unmount', () => {
		setup();
		mounted!.click('#custom-connect');
		flushEffects();
		const dialog = document.querySelector('.rk-dialog') as HTMLElement;
		dialog.click();
		flushEffects();
		expect(document.querySelector('[role="dialog"]')).not.toBeNull();
		(document.querySelector('.rk-overlay') as HTMLElement).click();
		flushEffects();
		expect(document.querySelector('[role="dialog"]')).toBeNull();

		mounted!.click('#custom-connect');
		flushEffects();
		expect(document.body.style.overflow).toBe('hidden');
		mounted!.unmount();
		mounted = undefined;
		flushEffects();
		expect(document.body.style.overflow).toBe('');
		expect(document.querySelector('[aria-hidden="true"]')).toBeNull();
	});

	it('contains forward and reverse Tab navigation', () => {
		setup();
		mounted!.click('#custom-connect');
		flushEffects();
		const close = document.querySelector('.rk-close') as HTMLButtonElement;
		const action = document.querySelector('.rk-action') as HTMLButtonElement;
		action.focus();
		document.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
		);
		expect(document.activeElement).toBe(close);
		close.focus();
		document.dispatchEvent(
			new KeyboardEvent('keydown', {
				key: 'Tab',
				shiftKey: true,
				bubbles: true,
				cancelable: true,
			}),
		);
		expect(document.activeElement).toBe(action);
	});

	it('applies explicit theme tokens to the provider boundary', () => {
		const config = createConfig({
			chains: [mainnet],
			connectors: [mock({ accounts: [account] })],
			transports: { [mainnet.id]: http() },
		});
		mounted = mount(App, {
			config,
			queryClient: new QueryClient(),
			theme: darkTheme({ accentColor: '#123456', borderRadius: 'small' }),
		});
		const root = document.querySelector('[data-rk]') as HTMLElement;
		expect(root.style.getPropertyValue('--rk-accent')).toBe('#123456');
		expect(root.style.getPropertyValue('--rk-modal-radius')).toBe('8px');
	});

	it('deduplicates by connector uid and explains configured unavailable wallets', () => {
		const config = setup([
			{ id: 'mock', name: 'Preferred mock' },
			{
				id: 'walletConnect',
				name: 'WalletConnect',
				unavailableReason: 'WalletConnect projectId is required.',
			},
		]);
		mounted!.click('#custom-connect');
		flushEffects();
		const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.rk-list button'));
		expect(buttons.map((button) => button.textContent?.trim())).toEqual([
			'Preferred mock',
			'WalletConnect',
		]);
		expect(buttons[1]!.disabled).toBe(true);
		expect(document.querySelector('.rk-list')?.textContent).toContain(
			'WalletConnect projectId is required.',
		);
		expect(config.connectors[0]!.uid).toBeTruthy();
	});

	it('keeps the connect modal useful when no compatible wallets exist', () => {
		const config = createConfig({
			chains: [mainnet],
			connectors: [],
			transports: { [mainnet.id]: http() },
		});
		mounted = mount(App, { config, queryClient: new QueryClient() });
		flushEffects();
		flushSync(() => {});
		(document.querySelector('.rk-connect-button') as HTMLButtonElement).click();
		flushEffects();
		expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
			'No compatible wallets are available.',
		);
	});

	it('keeps a rejected connector actionable and retries only on another click', async () => {
		const config = setup();
		let attempts = 0;
		config.connectors[0]!.connect = async () => {
			attempts++;
			throw new Error('User rejected request');
		};
		mounted!.click('#custom-connect');
		flushEffects();
		(document.querySelector('.rk-action') as HTMLButtonElement).click();
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		expect(attempts).toBe(1);
		expect(document.querySelector('[role="alert"]')?.textContent).toContain(
			'User rejected request',
		);
		(document.querySelector('.rk-action') as HTMLButtonElement).click();
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		expect(attempts).toBe(2);
	});

	it('announces awaiting approval and exposes Custom connecting state', async () => {
		const config = setup();
		let release!: () => void;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		const connector = config.connectors[0]!;
		const original = connector.connect.bind(connector);
		connector.connect = async (parameters) => {
			await gate;
			return original(parameters);
		};
		mounted!.click('#custom-connect');
		flushEffects();
		(document.querySelector('.rk-action') as HTMLButtonElement).click();
		await act(async () => {
			await Promise.resolve();
		});
		expect(mounted!.find('#connection-status').textContent).toBe('connecting');
		expect(document.querySelector('[role="status"]')?.textContent).toContain(
			'Waiting for wallet approval',
		);
		release();
		await act(async () => {
			await gate;
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
	});

	it('clears a pending modal connection after dismissal without reopening it', async () => {
		const config = setup();
		let release!: () => void;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		const connector = config.connectors[0]!;
		const original = connector.connect.bind(connector);
		connector.connect = async (parameters) => {
			await gate;
			return original(parameters);
		};
		const opener = mounted!.find('#custom-connect') as HTMLButtonElement;
		opener.focus();
		opener.click();
		flushEffects();
		(document.querySelector('.rk-action') as HTMLButtonElement).click();
		await act(async () => {
			await Promise.resolve();
		});
		expect(mounted!.find('#connection-status').textContent).toBe('connecting');

		act(() => {
			document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		});
		flushEffects();
		await Promise.resolve();
		expect(document.querySelector('[role="dialog"]')).toBeNull();
		expect(document.activeElement).toBe(opener);

		release();
		await act(async () => {
			await gate;
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		expect(mounted!.find('#connection-status').textContent).not.toBe('connecting');
		expect(document.querySelector('[role="dialog"]')).toBeNull();
		expect(document.activeElement).toBe(opener);
	});

	it('shares slow WalletButton connection state with Custom and default controls', async () => {
		const config = setup();
		let release!: () => void;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		const connector = config.connectors[0]!;
		const original = connector.connect.bind(connector);
		connector.connect = async (parameters) => {
			await gate;
			return original(parameters);
		};
		const wallet = document.querySelector('.rk-wallet-button') as HTMLButtonElement;
		wallet.click();
		await act(async () => {
			await Promise.resolve();
		});
		expect(mounted!.find('#connection-status').textContent).toBe('connecting');
		expect(wallet.disabled).toBe(true);
		expect((document.querySelector('.rk-connect-button') as HTMLButtonElement).disabled).toBe(true);
		release();
		await act(async () => {
			await gate;
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
	});

	it('keeps newer WalletButton pending state when an older request completes first', async () => {
		const config = setup();
		const releases: Array<() => void> = [];
		const connector = config.connectors[0]!;
		const original = connector.connect.bind(connector);
		connector.connect = async (parameters) => {
			await new Promise<void>((resolve) => releases.push(resolve));
			return original(parameters);
		};
		latestWalletConnect!();
		latestWalletConnect!();
		await act(async () => {
			await Promise.resolve();
		});
		expect(mounted!.find('#connection-status').textContent).toBe('connecting');
		releases[0]!();
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		expect(mounted!.find('#connection-status').textContent).toBe('connecting');
		releases[1]!();
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		expect(mounted!.find('#connection-status').textContent).not.toBe('connecting');
	});

	it('keeps the older WalletButton pending state when a newer request completes first', async () => {
		const config = setup();
		const releases: Array<() => void> = [];
		const connector = config.connectors[0]!;
		const original = connector.connect.bind(connector);
		connector.connect = async (parameters) => {
			await new Promise<void>((resolve) => releases.push(resolve));
			return original(parameters);
		};
		latestWalletConnect!();
		latestWalletConnect!();
		await act(async () => {
			await Promise.resolve();
		});
		expect(mounted!.find('#connection-status').textContent).toBe('connecting');
		releases[1]!();
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		expect(mounted!.find('#connection-status').textContent).toBe('connecting');
		releases[0]!();
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		expect(mounted!.find('#connection-status').textContent).not.toBe('connecting');
	});

	it('shows wrong-network controls and recovers through the chain modal', async () => {
		const config = createConfig({
			chains: [mainnet, sepolia],
			connectors: [mock({ accounts: [account] })],
			transports: { [mainnet.id]: http(), [sepolia.id]: http() },
		});
		mounted = mount(App, {
			config,
			queryClient: new QueryClient({ defaultOptions: { mutations: { retry: false } } }),
		});
		flushEffects();
		flushSync(() => {});
		(document.querySelector('.rk-wallet-button') as HTMLButtonElement).click();
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		act(() => {
			config.setState((state) => ({ ...state, chainId: 999_999 }));
		});
		flushEffects();
		expect(mounted.find('#custom-status').textContent).toBe('wrong-chain');
		const wrong = Array.from(
			document.querySelectorAll<HTMLButtonElement>('.rk-connect-button'),
		).find((button) => button.textContent?.includes('Wrong network'))!;
		wrong.click();
		flushEffects();
		const sepoliaButton = Array.from(
			document.querySelectorAll<HTMLButtonElement>('.rk-dialog .rk-action'),
		).find((button) => button.textContent?.includes('Sepolia'))!;
		sepoliaButton.click();
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		expect(document.querySelector('[role="dialog"]')).toBeNull();
		expect(mounted.find('#custom-status').textContent).toBe('connected');
	});

	it('never submits an enclosing form from package controls or modal actions', () => {
		let submits = 0;
		const config = createConfig({
			chains: [mainnet],
			connectors: [mock({ accounts: [account] })],
			transports: { [mainnet.id]: http() },
		});
		mounted = mount(App, {
			config,
			queryClient: new QueryClient(),
			onSubmit: (event) => {
				event.preventDefault();
				submits++;
			},
		});
		flushEffects();
		flushSync(() => {});
		(document.querySelector('.rk-connect-button') as HTMLButtonElement).click();
		flushEffects();
		(document.querySelector('.rk-close') as HTMLButtonElement).click();
		flushEffects();
		expect(submits).toBe(0);
	});

	it('coordinates topmost Escape and body locking across providers', async () => {
		const config = createConfig({
			chains: [mainnet],
			connectors: [mock({ accounts: [account] })],
			transports: { [mainnet.id]: http() },
		});
		mounted = mount(TwoProviders, {
			config,
			queryClient: new QueryClient({ defaultOptions: { mutations: { retry: false } } }),
		});
		flushEffects();
		mounted.click('#first-provider');
		flushEffects();
		mounted.click('#second-provider');
		flushEffects();
		const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
		expect(dialogs).toHaveLength(2);
		expect(dialogs[0]!.getAttribute('aria-labelledby')).not.toBe(
			dialogs[1]!.getAttribute('aria-labelledby'),
		);
		expect(dialogs[1]!.closest('[inert]')).toBeNull();
		act(() => {
			document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		});
		flushEffects();
		await Promise.resolve();
		expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
		expect(document.body.style.overflow).toBe('hidden');
		expect(document.activeElement).toBe(dialogs[0]);
		act(() => {
			document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		});
		flushEffects();
		expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(0);
		expect(document.body.style.overflow).toBe('');
	});

	it('coordinates modal stacks and body locks independently per ownerDocument', async () => {
		const config = setup();
		mounted!.click('#custom-connect');
		flushEffects();
		const secondaryDocument = document.implementation.createHTMLDocument('secondary');
		const secondaryContainer = secondaryDocument.createElement('div');
		secondaryDocument.body.appendChild(secondaryContainer);
		const secondaryConfig = createConfig({
			chains: [mainnet],
			connectors: [mock({ accounts: [account] })],
			transports: { [mainnet.id]: http() },
		});
		const secondaryRoot = createRoot(secondaryContainer);
		secondaryRoot.render(ProgrammaticProvider, {
			config: secondaryConfig,
			queryClient: new QueryClient(),
		});
		flushSync(() => {});
		flushEffects();
		flushSync(() => {});
		(secondaryContainer.querySelector('#programmatic-open') as HTMLButtonElement).click();
		flushSync(() => {});
		flushEffects();
		try {
			expect(document.body.style.overflow).toBe('hidden');
			expect(secondaryDocument.body.style.overflow).toBe('hidden');
			expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
			expect(secondaryDocument.querySelectorAll('[role="dialog"]')).toHaveLength(1);
			secondaryDocument.dispatchEvent(
				new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
			);
			flushSync(() => {});
			flushEffects();
			await Promise.resolve();
			expect(secondaryDocument.querySelector('[role="dialog"]')).toBeNull();
			expect(secondaryDocument.body.style.overflow).toBe('');
			expect(document.querySelector('[role="dialog"]')).not.toBeNull();
			expect(document.body.style.overflow).toBe('hidden');
		} finally {
			secondaryRoot.unmount();
		}
	});

	it('does not let a stale connect success close a newer modal generation', async () => {
		const config = setup();
		let release!: () => void;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		const connector = config.connectors[0]!;
		const original = connector.connect.bind(connector);
		connector.connect = async (parameters) => {
			await gate;
			return original(parameters);
		};
		mounted!.click('#custom-connect');
		flushEffects();
		(document.querySelector('.rk-action') as HTMLButtonElement).click();
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		flushEffects();
		mounted!.click('#custom-connect');
		flushEffects();
		release();
		await act(async () => {
			await gate;
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
		expect(document.querySelector('[role="dialog"]')).not.toBeNull();
	});
});
