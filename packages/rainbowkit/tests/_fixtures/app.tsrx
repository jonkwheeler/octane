import { QueryClientProvider } from '@octanejs/tanstack-query';
import { WagmiProvider, type Config } from '@octanejs/wagmi';
import {
	ConnectButton,
	RainbowKitProvider,
	WalletButton,
	useAccountModal,
	useChainModal,
	useConnectModal,
	type Theme,
	type WalletDescriptor,
} from '@octanejs/rainbowkit';

function CustomControl() @{
	<ConnectButton.Custom>
		{(state) => <div>
			<span id="custom-status">
				{state.account
					? state.chain?.unsupported
						? 'wrong-chain'
						: 'connected'
					: state.connectModalOpen
						? 'modal-open'
						: 'disconnected'}
			</span>
			<span id="mounted">{String(state.mounted)}</span>
			<button id="custom-connect" onClick={state.openConnectModal}>Open wallets</button>
		</div>}
	</ConnectButton.Custom>
}

export function App(props: {
	config: Config;
	queryClient: unknown;
	theme?: Theme;
	wallets?: readonly WalletDescriptor[];
}) @{
	<WagmiProvider config={props.config} reconnectOnMount={false}>
		<QueryClientProvider client={props.queryClient}>
			<button id="outside-provider">Outside provider</button>
			<RainbowKitProvider wallets={props.wallets} theme={props.theme}>
				<ConnectButton />
				<WalletButton wallet="mock" />
				<CustomControl />
			</RainbowKitProvider>
		</QueryClientProvider>
	</WagmiProvider>
}

function ModalOpener(props: { id: string }) @{
	const modal = useConnectModal();
	<button id={props.id} onClick={modal.openConnectModal}>Open {props.id}</button>
}

export function TwoProviders(props: { config: Config; queryClient: unknown }) @{
	<WagmiProvider config={props.config} reconnectOnMount={false}>
		<QueryClientProvider client={props.queryClient}>
			<RainbowKitProvider>
				<ModalOpener id="first-provider" />
			</RainbowKitProvider>
			<RainbowKitProvider>
				<ModalOpener id="second-provider" />
			</RainbowKitProvider>
		</QueryClientProvider>
	</WagmiProvider>
}

export function OutsideProvider() @{
	const connect = useConnectModal();
	const account = useAccountModal();
	const chain = useChainModal();
	<div>
		<span id="outside">{String(
			connect.openConnectModal === undefined && account.openAccountModal === undefined &&
				chain.openChainModal === undefined,
		)}</span>
	</div>
}
