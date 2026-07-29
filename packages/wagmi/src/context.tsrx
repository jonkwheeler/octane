import { useEffect, useRef } from 'octane';
import { hydrate, type ResolvedRegister, type State } from '@wagmi/core';
import type { OctaneNode } from 'octane';
import { WagmiContext } from './internal';

export type WagmiProviderProps = {
	config: ResolvedRegister['config'];
	initialState?: State;
	reconnectOnMount?: boolean;
	children?: OctaneNode;
};

export function WagmiProvider(props: WagmiProviderProps) @{
	const { onMount } = hydrate(props.config, {
		initialState: props.initialState,
		reconnectOnMount: props.reconnectOnMount ?? true,
	});
	const active = useRef(true);

	if (!props.config._internal.ssr) onMount();

	useEffect(() => {
		if (!active.current || !props.config._internal.ssr) return;
		onMount();
		return () => {
			active.current = false;
		};
	}, []);

	<WagmiContext.Provider value={props.config}>{props.children}</WagmiContext.Provider>
}
