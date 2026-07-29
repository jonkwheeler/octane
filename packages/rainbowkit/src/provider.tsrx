import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from 'octane';
import { useConnect, useConnection, useDisconnect, useSwitchChain } from '@octanejs/wagmi';
import type { OctaneNode } from 'octane';
import type { Connector } from '@wagmi/core';
import {
	RainbowKitContext,
	connectorIdentity,
	focusTopModal,
	isTopModal,
	lockBody,
	pushModal,
	registerModal,
	removeModal,
	unlockBody,
	type ModalKind,
	type ModalToken,
	type WalletDescriptor,
	type WalletEntry,
} from './internal';
import { lightTheme, type Theme } from './theme';
import './styles.css';

export type RainbowKitProviderProps = {
	children?: OctaneNode;
	theme?: Theme;
	wallets?: readonly WalletDescriptor[];
};

function themeStyle(theme: Theme): Record<string, string> {
	return {
		'--rk-accent': theme.colors.accentColor,
		'--rk-accent-foreground': theme.colors.accentColorForeground,
		'--rk-connect-background': theme.colors.connectButtonBackground,
		'--rk-connect-text': theme.colors.connectButtonText,
		'--rk-modal-background': theme.colors.modalBackground,
		'--rk-modal-text': theme.colors.modalText,
		'--rk-font-body': theme.fonts.body,
		'--rk-action-radius': theme.radii.actionButton,
		'--rk-connect-radius': theme.radii.connectButton,
		'--rk-modal-radius': theme.radii.modal,
	};
}

function walletEntries(
	connectors: readonly Connector[],
	descriptors: readonly WalletDescriptor[],
): readonly WalletEntry[] {
	const byIdentity = new Map(connectors.map(
		(connector) => [connectorIdentity(connector), connector],
	));
	const consumed = new Set<string>();
	const entries: WalletEntry[] = [];
	for (const descriptor of descriptors) {
		const fallback = connectors.find(
			(connector) => connector.id === descriptor.id || connector.name === descriptor.name,
		);
		const connector =
			descriptor.connectorUid ? byIdentity.get(descriptor.connectorUid) : fallback;
		const identity =
			connector ? connectorIdentity(connector) : descriptor.connectorUid || descriptor.id;
		if (consumed.has(identity)) continue;
		consumed.add(identity);
		entries.push({ ...descriptor, connector, identity });
	}
	for (const connector of connectors) {
		const identity = connectorIdentity(connector);
		if (consumed.has(identity)) continue;
		consumed.add(identity);
		entries.push({ id: connector.id, name: connector.name, connector, identity });
	}
	return entries;
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'The wallet request failed.';
}

function isolatedBackground(dialog: HTMLElement): HTMLElement[] {
	const elements = new Set<HTMLElement>();
	let child: HTMLElement = dialog;
	let parent = child.parentElement;
	while (parent) {
		for (const sibling of Array.from(parent.children)) {
			if (sibling !== child) elements.add(sibling as HTMLElement);
		}
		if (parent === document.body) break;
		child = parent;
		parent = parent.parentElement;
	}
	return [...elements];
}

function activateModalPath(dialog: HTMLElement) {
	const state: { element: HTMLElement; ariaHidden: string | null; inert: boolean }[] = [];
	let element: HTMLElement | null = dialog;
	while (element && element !== document.body) {
		state.push({
			element,
			ariaHidden: element.getAttribute('aria-hidden'),
			inert: element.inert,
		});
		element.inert = false;
		element.removeAttribute('aria-hidden');
		element = element.parentElement;
	}
	return state;
}

function Modal(props: {
	kind: ModalKind;
	token: ModalToken;
	wallets: readonly WalletEntry[];
	close: (token: ModalToken) => void;
	titleId: string;
	descriptionId: string;
}) @{
	const connection = useConnection();
	const connect = useConnect();
	const disconnect = useDisconnect();
	const switchChain = useSwitchChain();
	const dialogRef = useRef<HTMLElement | null>(null);
	const title =
		props.kind === 'connect'
			? 'Connect a wallet'
			: props.kind === 'chain'
				? 'Switch network'
				: 'Account';
	const description =
		props.kind === 'connect'
			? 'Choose an available wallet.'
			: props.kind === 'chain'
				? 'Choose a network for the connected wallet.'
				: 'Manage the connected wallet.';

	useLayoutEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog || typeof document === 'undefined') return;
		lockBody();
		registerModal(props.token, dialog);
		const pathState = activateModalPath(dialog);
		const backgroundState = isolatedBackground(dialog).map(
			(element) => ({
				element,
				ariaHidden: element.getAttribute('aria-hidden'),
				inert: element.inert,
			}),
		);
		for (const state of backgroundState) {
			state.element.inert = true;
			state.element.setAttribute('aria-hidden', 'true');
		}
		const focusable = () => Array.from(
			dialog.querySelectorAll<HTMLElement>(
				'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
			),
		);
		focusable()[0]?.focus();
		const onKeyDown = (event: KeyboardEvent) => {
			if (!isTopModal(props.token)) return;
			if (event.key === 'Escape') {
				event.preventDefault();
				props.close(props.token);
				return;
			}
			if (event.key !== 'Tab') return;
			const items = focusable();
			if (items.length === 0) {
				event.preventDefault();
				dialog.focus();
				return;
			}
			const first = items[0]!;
			const last = items.at(-1)!;
			if (!dialog.contains(document.activeElement)) {
				event.preventDefault();
				((event.shiftKey ? last : first)).focus();
			} else if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		};
		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.removeEventListener('keydown', onKeyDown);
			removeModal(props.token);
			unlockBody();
			for (const state of backgroundState) {
				state.element.inert = state.inert;
				if (state.ariaHidden === null) state.element.removeAttribute('aria-hidden');
				else state.element.setAttribute('aria-hidden', state.ariaHidden);
			}
			for (const state of pathState) {
				state.element.inert = state.inert;
				if (state.ariaHidden === null) state.element.removeAttribute('aria-hidden');
				else state.element.setAttribute('aria-hidden', state.ariaHidden);
			}
			queueMicrotask(() => focusTopModal());
		};
	}, [props.token]);

	const connectWallet = (entry: WalletEntry) => {
		if (!entry.connector) return;
		connect.connect({ connector: entry.connector }, { onSuccess: () => props.close(props.token) });
	};

	<div
		className="rk-overlay"
		data-rk-overlay=""
		onClick={(event) => {
			if (event.target === event.currentTarget && isTopModal(props.token)) props.close(props.token);
		}}
	>
		<section
			className="rk-dialog"
			ref={dialogRef}
			role="dialog"
			aria-modal="true"
			aria-labelledby={props.titleId}
			aria-describedby={props.descriptionId}
			tabIndex={-1}
		>
			<header className="rk-dialog-header">
				<h2 id={props.titleId}>{title}</h2>
				<button className="rk-close" aria-label="Close" onClick={() => props.close(props.token)}>
					×
				</button>
			</header>
			<p id={props.descriptionId}>{description}</p>
			<div role="status" aria-live="polite">
				{connect.isPending
					? 'Waiting for wallet approval'
					: switchChain.isPending
						? 'Switching network'
						: disconnect.isPending
							? 'Disconnecting wallet'
							: ''}
			</div>
			@if (props.kind === 'connect') {
				<>
					@if (props.wallets.length === 0) {
						<p>No compatible wallets are available.</p>
					} @else {
						<ul className="rk-list">
							@for (const wallet of props.wallets; key wallet.identity) {
								<li>
									<button
										className="rk-action"
										disabled={connect.isPending || !wallet.connector}
										onClick={() => connectWallet(wallet)}
									>
										{connect.isPending && wallet.connector
											? `Waiting for ${wallet.name}`
											: wallet.name}
									</button>
									@if (!wallet.connector) {
										<p>{wallet.unavailableReason ?? 'Wallet is unavailable in this browser.'}</p>
									}
								</li>
							}
						</ul>
					}
					@if (connect.error) {
						<p role="alert">{errorMessage(connect.error)}</p>
					}
				</>
			} @else {
				@if (props.kind === 'chain') {
					<>
						<ul className="rk-list">
							@for (const chain of switchChain.chains; key chain.id) {
								<li>
									<button
										className="rk-action"
										disabled={switchChain.isPending || connection.chainId === chain.id}
										onClick={() => switchChain.mutate({ chainId: chain.id }, {
											onSuccess: () => props.close(props.token),
										})}
									>{chain.name}</button>
								</li>
							}
						</ul>
						@if (switchChain.error) {
							<p role="alert">{errorMessage(switchChain.error)}</p>
						}
					</>
				} @else {
					<>
						<p>{connection.address ?? 'No connected account'}</p>
						<button
							className="rk-action"
							disabled={disconnect.isPending || connection.status !== 'connected'}
							onClick={() => disconnect.mutate(undefined, {
								onSuccess: () => props.close(props.token),
							})}
						>
							Disconnect
						</button>
						@if (disconnect.error) {
							<p role="alert">{errorMessage(disconnect.error)}</p>
						}
					</>
				}
			}
		</section>
	</div>
}

export function RainbowKitProvider(props: RainbowKitProviderProps) @{
	const [activeModal, setActiveModal] = useState<
		| {
				kind: ModalKind;
				token: ModalToken;
				opener: HTMLElement | null;
		  }
		| null
	>(null);
	const connection = useConnection();
	const connectors = useConnect().connectors;
	const wallets = useMemo(() => walletEntries(connectors, props.wallets ?? []), [
		connectors,
		props.wallets,
	]);
	const selectedTheme = props.theme ?? lightTheme();
	const providerId = useId();
	const closeModal = useCallback((token?: ModalToken) => {
		setActiveModal((current) => {
			if (!current || token && current.token !== token) return current;
			removeModal(current.token);
			const returnTo = current.opener;
			queueMicrotask(() => {
				if (!focusTopModal()) returnTo?.isConnected && returnTo.focus();
			});
			return null;
		});
	}, []);
	const openModal = useCallback((kind: ModalKind, nextOpener?: HTMLElement | null) => {
		setActiveModal((current) => {
			if (current) removeModal(current.token);
			const token = Symbol(`rainbowkit-modal-${providerId}`);
			pushModal(token);
			return {
				kind,
				token,
				opener: nextOpener ??
					(typeof document === 'undefined' ? null : document.activeElement as HTMLElement | null),
			};
		});
	}, [providerId]);
	const context = useMemo(
		() => ({
			activeModal,
			closeModal,
			connected: connection.status === 'connected',
			openModal,
			wallets,
		}),
		[activeModal, closeModal, connection.status, openModal, wallets],
	);

	<div data-rk="" style={themeStyle(selectedTheme)}>
		<RainbowKitContext.Provider value={context}>
			{props.children}
			@if (activeModal) {
				<Modal
					kind={activeModal.kind}
					token={activeModal.token}
					wallets={wallets}
					close={closeModal}
					titleId={`${providerId}-title`}
					descriptionId={`${providerId}-description`}
				/>
			}
		</RainbowKitContext.Provider>
	</div>
}
