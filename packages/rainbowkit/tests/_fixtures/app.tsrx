import { QueryClientProvider } from '@octanejs/tanstack-query';
import { WagmiProvider, type Config } from '@octanejs/wagmi';
import {
	ConnectButton,
	RainbowKitProvider,
	useAccountModal,
	useChainModal,
	useConnectModal,
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
			<button id="custom-connect" onClick={state.openConnectModal}>Open wallets</button>
		</div>}
	</ConnectButton.Custom>
}

export function App(props: { config: Config; queryClient: unknown }) @{
	<WagmiProvider config={props.config} reconnectOnMount={false}>
		<QueryClientProvider client={props.queryClient}>
			<RainbowKitProvider>
				<ConnectButton />
				<CustomControl />
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
