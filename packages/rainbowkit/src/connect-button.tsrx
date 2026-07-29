import { useChainId, useChains, useConnection, useDisconnect } from '@octanejs/wagmi';
import { useEffect, useState, type OctaneNode } from 'octane';
import { useAccountModal, useChainModal, useConnectModal } from './hooks';

export type ConnectButtonRendererProps = {
	account?: { address: string; displayName: string };
	accountModalOpen: boolean;
	authenticationStatus?: undefined;
	chain?: { id: number; name?: string; unsupported: boolean };
	chainModalOpen: boolean;
	connectModalOpen: boolean;
	mounted: boolean;
	openAccountModal?: (event?: Event) => void;
	openChainModal?: (event?: Event) => void;
	openConnectModal?: (event?: Event) => void;
};

export type ConnectButtonProps = {
	chainStatus?: 'name' | 'none';
	label?: string;
};

function formatAddress(address: string): string {
	return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function useConnectButtonState(): ConnectButtonRendererProps {
	const connection = useConnection();
	const chainId = useChainId();
	const chains = useChains();
	const accountModal = useAccountModal();
	const chainModal = useChainModal();
	const connectModal = useConnectModal();
	const chain = chains.find((candidate) => candidate.id === chainId);
	const connected = connection.status === 'connected' && Boolean(connection.address);
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	return {
		account: connected
			? {
					address: connection.address!,
					displayName: formatAddress(connection.address!),
				}
			: undefined,
		accountModalOpen: accountModal.accountModalOpen,
		authenticationStatus: undefined,
		chain: connected
			? { id: chainId, name: chain?.name, unsupported: chain === undefined }
			: undefined,
		chainModalOpen: chainModal.chainModalOpen,
		connectModalOpen: connectModal.connectModalOpen,
		mounted,
		openAccountModal: accountModal.openAccountModal,
		openChainModal: chainModal.openChainModal,
		openConnectModal: connectModal.openConnectModal,
	};
}

export function ConnectButton(props: ConnectButtonProps = {}) @{
	const state = useConnectButtonState();
	const disconnect = useDisconnect();
	@if (!state.account) {
		<button className="rk-connect-button" onClick={state.openConnectModal}>
			{props.label ?? 'Connect Wallet'}
		</button>
	} @else {
		<div>
			@if (state.chain?.unsupported) {
				<button className="rk-connect-button" onClick={state.openChainModal}>Wrong network</button>
			} @else {
				@if (props.chainStatus !== 'none') {
					<button className="rk-connect-button" onClick={state.openChainModal}>
						{state.chain?.name ?? `Chain ${state.chain?.id}`}
					</button>
				}
			}
			<button
				className="rk-connect-button"
				onClick={state.openAccountModal}
			>{state.account.displayName}</button>
			<button
				className="rk-connect-button"
				disabled={disconnect.isPending}
				onClick={() => disconnect.mutate(undefined)}
			>
				Disconnect
			</button>
		</div>
	}
}

ConnectButton.Custom = function ConnectButtonCustom(props: {
	children: (state: ConnectButtonRendererProps) => OctaneNode;
}) {
	return props.children(useConnectButtonState());
};
