import { QueryClientProvider } from '@octanejs/tanstack-query';
import { WagmiProvider, useBalance, useSignMessage, type Config } from '@octanejs/wagmi';

function BalancePair(props: { address: `0x${string}` }) @{
	const first = useBalance({ address: props.address, query: { retry: false } });
	const second = useBalance({ address: props.address, query: { retry: false } });
	<>
		<span id="first">
			{first.isSuccess ? first.data.value.toString() : first.status}
		</span>
		<span id="second">
			{second.isSuccess ? second.data.value.toString() : second.status}
		</span>
		<span id="balance-error">
			{first.error ? first.error.message : '-'}
		</span>
	</>
}

export function BalanceApp(props: {
	address: `0x${string}`;
	config: Config;
	queryClient: unknown;
}) @{
	<WagmiProvider config={props.config} reconnectOnMount={false}>
		<QueryClientProvider client={props.queryClient}>
			<BalancePair address={props.address} />
		</QueryClientProvider>
	</WagmiProvider>
}

function Signer() @{
	const sign = useSignMessage();
	<>
		<button id="sign" onClick={() => sign.signMessage({ message: 'octane' })}>sign</button>
		<span id="sign-status">{sign.status}</span>
		<span id="signature">{sign.data ?? '-'}</span>
		<span id="sign-error">
			{sign.error ? sign.error.name + ':' + sign.error.message : '-'}
		</span>
	</>
}

export function SignApp(props: { config: Config; queryClient: unknown }) @{
	<WagmiProvider config={props.config} reconnectOnMount={false}>
		<QueryClientProvider client={props.queryClient}>
			<Signer />
		</QueryClientProvider>
	</WagmiProvider>
}
