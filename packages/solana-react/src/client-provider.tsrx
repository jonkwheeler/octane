import { useEffect, useMemo } from 'octane';
import type { OctaneNode } from 'octane';
import type { Client as SolanaClient } from '@solana/kit';
import { ClientContext } from './client-context';
import { createClientStore } from './client-store';

export type ClientProviderProps =
	Readonly<{
		client: SolanaClient<object>;
		children?: OctaneNode;
	}>;

export function ClientProvider(props: ClientProviderProps) @{
	const store = useMemo(() => createClientStore(props.client), [props.client]);
	useEffect(() => () => store.dispose(), [store]);
	<ClientContext.Provider value={store}>{props.children}</ClientContext.Provider>
}
