import { createContext } from 'octane';
import type { Connector } from '@wagmi/core';

export type ModalKind = 'account' | 'chain' | 'connect';
export type ModalToken = string;

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
	beginConnecting: () => symbol;
	closeModal: (token?: ModalToken) => void;
	connected: boolean;
	connecting: boolean;
	endConnecting: (token: symbol) => void;
	mounted: boolean;
	openModal: (kind: ModalKind, opener?: HTMLElement | null) => void;
	wallets: readonly WalletEntry[];
};

export const RainbowKitContext = createContext<RainbowKitContextValue | null>(null);

type DocumentModalState = {
	stack: ModalToken[];
	elements: Map<ModalToken, HTMLElement>;
	bodyLockCount: number;
	originalBodyOverflow: string;
};

const documentStates = new WeakMap<Document, DocumentModalState>();
const tokenDocuments = new Map<ModalToken, Document>();

function stateFor(document: Document): DocumentModalState {
	let state = documentStates.get(document);
	if (!state) {
		state = { stack: [], elements: new Map(), bodyLockCount: 0, originalBodyOverflow: '' };
		documentStates.set(document, state);
	}
	return state;
}

export function connectorIdentity(connector: Connector): string {
	return connector.uid || `${connector.id}:${connector.name}`;
}

export function pushModal(token: ModalToken, document: Document): void {
	removeModal(token);
	tokenDocuments.set(token, document);
	stateFor(document).stack.push(token);
}

export function removeModal(token: ModalToken): void {
	const document = tokenDocuments.get(token);
	if (!document) return;
	const state = stateFor(document);
	const index = state.stack.indexOf(token);
	if (index >= 0) state.stack.splice(index, 1);
	state.elements.delete(token);
	tokenDocuments.delete(token);
}

export function isTopModal(token: ModalToken): boolean {
	const document = tokenDocuments.get(token);
	return document ? stateFor(document).stack.at(-1) === token : false;
}

export function registerModal(token: ModalToken, element: HTMLElement): void {
	const document = element.ownerDocument;
	tokenDocuments.set(token, document);
	stateFor(document).elements.set(token, element);
}

export function focusTopModal(document: Document): boolean {
	const state = stateFor(document);
	const token = state.stack.at(-1);
	const element = token ? state.elements.get(token) : undefined;
	if (element && !element.contains(document.activeElement)) element.focus();
	return Boolean(element);
}

export function lockBody(document: Document): void {
	const state = stateFor(document);
	if (state.bodyLockCount++ === 0) {
		state.originalBodyOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
	}
}

export function unlockBody(document: Document): void {
	const state = stateFor(document);
	if (state.bodyLockCount === 0) return;
	if (--state.bodyLockCount === 0) document.body.style.overflow = state.originalBodyOverflow;
}
