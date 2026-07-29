import { createContext } from 'octane';
import type { Connector } from '@wagmi/core';

export type ModalKind = 'account' | 'chain' | 'connect';

export type RainbowKitContextValue = {
	activeModal: ModalKind | null;
	closeModal: () => void;
	connectors: readonly Connector[];
	openModal: (kind: ModalKind, opener?: HTMLElement | null) => void;
};

export const RainbowKitContext = createContext<RainbowKitContextValue | null>(null);

export function subSlot(slot: symbol | undefined, name: string): symbol {
	return Symbol.for(`octane.rainbowkit.${slot?.description ?? 'root'}.${name}`);
}
