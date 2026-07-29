import { createContext } from 'octane';
import type { Connector } from '@wagmi/core';

export type ModalKind = 'account' | 'chain' | 'connect';
export type ModalToken = symbol;

export type WalletDescriptor = {
	id: string;
	name: string;
	connectorUid?: string;
	unavailableReason?: string;
};

export type WalletEntry = WalletDescriptor & {
	connector?: Connector;
	identity: string;
};

export type RainbowKitContextValue = {
	activeModal: { kind: ModalKind; token: ModalToken } | null;
	closeModal: (token?: ModalToken) => void;
	connected: boolean;
	openModal: (kind: ModalKind, opener?: HTMLElement | null) => void;
	wallets: readonly WalletEntry[];
};

export const RainbowKitContext = createContext<RainbowKitContextValue | null>(null);

const modalStack: ModalToken[] = [];
const modalElements = new Map<ModalToken, HTMLElement>();
let bodyLockCount = 0;
let originalBodyOverflow = '';

export function connectorIdentity(connector: Connector): string {
	return connector.uid || `${connector.id}:${connector.name}`;
}

export function pushModal(token: ModalToken): void {
	removeModal(token);
	modalStack.push(token);
}

export function removeModal(token: ModalToken): void {
	const index = modalStack.indexOf(token);
	if (index >= 0) modalStack.splice(index, 1);
	modalElements.delete(token);
}

export function isTopModal(token: ModalToken): boolean {
	return modalStack.at(-1) === token;
}

export function registerModal(token: ModalToken, element: HTMLElement): void {
	modalElements.set(token, element);
}

export function focusTopModal(): boolean {
	const token = modalStack.at(-1);
	const element = token ? modalElements.get(token) : undefined;
	element?.focus();
	return Boolean(element);
}

export function lockBody(): void {
	if (typeof document === 'undefined') return;
	if (bodyLockCount++ === 0) {
		originalBodyOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
	}
}

export function unlockBody(): void {
	if (typeof document === 'undefined' || bodyLockCount === 0) return;
	if (--bodyLockCount === 0) document.body.style.overflow = originalBodyOverflow;
}
