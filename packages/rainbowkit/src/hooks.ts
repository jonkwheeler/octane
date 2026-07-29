import { useContext } from 'octane';
import { RainbowKitContext } from './internal';

export function useConnectModal(): {
	connectModalOpen: boolean;
	openConnectModal?: (event?: Event) => void;
} {
	const context = useContext(RainbowKitContext);
	return {
		connectModalOpen: context?.activeModal === 'connect',
		openConnectModal: context
			? (event) =>
					context.openModal('connect', event?.currentTarget as HTMLElement | null | undefined)
			: undefined,
	};
}

export function useAccountModal(): {
	accountModalOpen: boolean;
	openAccountModal?: (event?: Event) => void;
} {
	const context = useContext(RainbowKitContext);
	return {
		accountModalOpen: context?.activeModal === 'account',
		openAccountModal: context
			? (event) =>
					context.openModal('account', event?.currentTarget as HTMLElement | null | undefined)
			: undefined,
	};
}

export function useChainModal(): {
	chainModalOpen: boolean;
	openChainModal?: (event?: Event) => void;
} {
	const context = useContext(RainbowKitContext);
	return {
		chainModalOpen: context?.activeModal === 'chain',
		openChainModal: context
			? (event) =>
					context.openModal('chain', event?.currentTarget as HTMLElement | null | undefined)
			: undefined,
	};
}
