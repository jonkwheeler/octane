import { useConnect } from '@octanejs/wagmi';
import { useContext } from 'octane';
import type { OctaneNode } from 'octane';
import { RainbowKitContext } from './internal';

export type WalletButtonProps = {
	children?: (props: { ready: boolean; connect: () => void }) => OctaneNode;
	wallet: string;
};

export function WalletButton(props: WalletButtonProps) @{
	const context = useContext(RainbowKitContext);
	const mutation = useConnect();
	const connector = context?.connectors.find(
		(candidate) => candidate.id === props.wallet || candidate.name === props.wallet,
	);
	const ready = Boolean(connector);
	const connect = () => connector && mutation.connect({ connector });
	@if (props.children) {
		{
			props.children({ ready, connect });
		}
	} @else {
		<button className="rk-wallet-button" disabled={!ready || mutation.isPending} onClick={connect}>
			{connector?.name ?? props.wallet}
		</button>
	}
}
