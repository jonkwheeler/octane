import { useLayoutEffect, useMemo, useRef, useState } from 'octane';
import {
	useChains,
	useConnect,
	useConnection,
	useDisconnect,
	useSwitchChain,
} from '@octanejs/wagmi';
import type { OctaneNode } from 'octane';
import type { Connector } from '@wagmi/core';
import { RainbowKitContext, subSlot, type ModalKind } from './internal';
import { lightTheme, type Theme } from './theme';
import './styles.css';

export type RainbowKitProviderProps = {
	children?: OctaneNode;
	coolMode?: boolean;
	initialChain?: number;
	locale?: string;
	modalSize?: 'compact' | 'wide';
	showRecentTransactions?: boolean;
	theme?: Theme;
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

function uniqueConnectors(connectors: readonly Connector[]): readonly Connector[] {
	const identities = new Set<string>();
	return connectors.filter((connector) => {
		const identity = `${connector.id}:${connector.name}`;
		if (identities.has(identity)) return false;
		identities.add(identity);
		return true;
	});
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'The wallet request failed.';
}

function Modal(props: {
	kind: ModalKind;
	connectors: readonly Connector[];
	close: () => void;
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
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		const background = Array.from(dialog.closest('[data-rk]')?.children ?? []).filter(
			(element) => !element.contains(dialog),
		) as HTMLElement[];
		const backgroundState = background.map(
			(element) => ({
				element,
				ariaHidden: element.getAttribute('aria-hidden'),
				inert: element.inert,
			}),
		);
		for (const element of background) {
			element.inert = true;
			element.setAttribute('aria-hidden', 'true');
		}
		const focusable = () => Array.from(
			dialog.querySelectorAll<HTMLElement>(
				'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
			),
		);
		focusable()[0]?.focus();
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				props.close();
				return;
			}
			if (event.key !== 'Tab') return;
			const items = focusable();
			if (items.length === 0) return;
			const first = items[0]!;
			const last = items.at(-1)!;
			if (event.shiftKey && document.activeElement === first) {
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
			document.body.style.overflow = previousOverflow;
			for (const state of backgroundState) {
				state.element.inert = state.inert;
				if (state.ariaHidden === null) state.element.removeAttribute('aria-hidden');
				else state.element.setAttribute('aria-hidden', state.ariaHidden);
			}
		};
	}, [props.close]);

	const connectWallet = (connector: Connector) => {
		connect.connect({ connector }, {
			onSuccess: () => props.close(),
		});
	};

	<div
		className="rk-overlay"
		data-rk-overlay=""
		onClick={(event) => {
			if (event.target === event.currentTarget) props.close();
		}}
	>
		<section
			className="rk-dialog"
			ref={dialogRef}
			role="dialog"
			aria-modal="true"
			aria-labelledby="rk-dialog-title"
			aria-describedby="rk-dialog-description"
			tabIndex={-1}
		>
			<header className="rk-dialog-header">
				<h2 id="rk-dialog-title">{title}</h2>
				<button className="rk-close" aria-label="Close" onClick={props.close}>×</button>
			</header>
			<p id="rk-dialog-description">{description}</p>
			<div role="status" aria-live="polite">
				{connect.isPending
					? 'Waiting for wallet approval'
					: switchChain.isPending
						? 'Switching network'
						: ''}
			</div>
			@if (props.kind === 'connect') {
				<>
					@if (props.connectors.length === 0) {
						<p>No compatible wallets are available.</p>
					} @else {
						<ul className="rk-list">
							@for (const connector of props.connectors; key connector.id) {
								<li>
									<button
										className="rk-action"
										disabled={connect.isPending}
										onClick={() => connectWallet(connector)}
									>
										{connect.isPending ? `Waiting for ${connector.name}` : connector.name}
									</button>
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
											onSuccess: () => props.close(),
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
							onClick={() => disconnect.mutate(undefined, { onSuccess: () => props.close() })}
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
	const [activeModal, setActiveModal] = useState<ModalKind | null>(null);
	const opener = useRef<HTMLElement | null>(null);
	const connectors = uniqueConnectors(useConnect().connectors);
	const selectedTheme = props.theme ?? lightTheme();
	const closeModal = () => {
		setActiveModal(null);
		const returnTo = opener.current;
		opener.current = null;
		queueMicrotask(() => returnTo?.focus());
	};
	const openModal = (kind: ModalKind, nextOpener?: HTMLElement | null) => {
		opener.current = nextOpener ?? document.activeElement as HTMLElement | null;
		setActiveModal(kind);
	};
	const context = useMemo(() => ({ activeModal, closeModal, connectors, openModal }), [
		activeModal,
		connectors,
	]);

	<div data-rk="" style={themeStyle(selectedTheme)}>
		<RainbowKitContext.Provider value={context}>
			{props.children}
			@if (activeModal) {
				<Modal kind={activeModal} connectors={connectors} close={closeModal} />
			}
		</RainbowKitContext.Provider>
	</div>
}
