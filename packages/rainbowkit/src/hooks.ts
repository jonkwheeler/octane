import { useContext } from 'octane';
import { RainbowKitContext, subSlot, type ModalKind } from './internal';

function useModal(kind: ModalKind, slot?: symbol) {
	const context = useContext(RainbowKitContext);
	return {
		[`${kind}ModalOpen`]: context?.activeModal === kind,
		[`open${kind[0]!.toUpperCase()}${kind.slice(1)}Modal`]: context
			? (event?: Event) =>
					context.openModal(kind, event?.currentTarget as HTMLElement | null | undefined)
			: undefined,
	};
}

export function useConnectModal(slot?: symbol): {
	connectModalOpen: boolean;
	openConnectModal?: (event?: Event) => void;
} {
	return useModal('connect', subSlot(slot, 'connect')) as {
		connectModalOpen: boolean;
		openConnectModal?: (event?: Event) => void;
	};
}

export function useAccountModal(slot?: symbol): {
	accountModalOpen: boolean;
	openAccountModal?: (event?: Event) => void;
} {
	return useModal('account', subSlot(slot, 'account')) as {
		accountModalOpen: boolean;
		openAccountModal?: (event?: Event) => void;
	};
}

export function useChainModal(slot?: symbol): {
	chainModalOpen: boolean;
	openChainModal?: (event?: Event) => void;
} {
	return useModal('chain', subSlot(slot, 'chain')) as {
		chainModalOpen: boolean;
		openChainModal?: (event?: Event) => void;
	};
}
