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
	const entry = context?.wallets.find(
		(candidate) =>
			candidate.identity === props.wallet || candidate.id === props.wallet ||
				candidate.name === props.wallet,
	);
	const connector = entry?.connector;
	const ready = Boolean(connector);
	const connect = () => connector && mutation.connect({ connector });
	@if (props.children) {
		{
			props.children({ ready, connect });
		}
	} @else {
		<button
			type="button"
			className="rk-wallet-button"
			disabled={!ready || mutation.isPending}
			onClick={connect}
		>
			{entry?.name ?? props.wallet}
		</button>
	}
}
