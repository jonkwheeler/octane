export type SolanaChain = `solana:${string}`;
export type WalletAccount = Readonly<{
	address: string;
	chains: readonly string[];
	features: readonly string[];
}>;
export type Wallet = Readonly<{
	name: string;
	accounts: readonly WalletAccount[];
	features: Readonly<Record<string, unknown>>;
}>;
export interface WalletRegistry {
	get(): readonly unknown[];
	on(event: 'register' | 'unregister', listener: (...wallets: unknown[]) => void): () => void;
}
export type WalletSnapshot = Readonly<{
	wallets: readonly Wallet[];
	selected: WalletAccount | null;
}>;

function normalizeWallet(value: unknown): Wallet | null {
	if (!value || typeof value !== 'object') return null;
	const input = value as Record<string, unknown>;
	if (
		typeof input.name !== 'string' ||
		!Array.isArray(input.accounts) ||
		!input.features ||
		typeof input.features !== 'object'
	)
		return null;
	const accounts = input.accounts.flatMap((account) => {
		if (!account || typeof account !== 'object') return [];
		const candidate = account as Record<string, unknown>;
		if (
			typeof candidate.address !== 'string' ||
			!Array.isArray(candidate.chains) ||
			!Array.isArray(candidate.features)
		)
			return [];
		if (
			!candidate.chains.every((chain) => typeof chain === 'string') ||
			!candidate.features.every((feature) => typeof feature === 'string')
		)
			return [];
		return [
			{
				address: candidate.address,
				chains: [...candidate.chains],
				features: [...candidate.features],
			},
		];
	});
	return { name: input.name, accounts, features: input.features as Record<string, unknown> };
}

export function createWalletStore(registry?: WalletRegistry) {
	let generation = 0;
	let selected: WalletAccount | null = null;
	let wallets: readonly Wallet[] = [];
	let snapshot: WalletSnapshot = { wallets, selected };
	const listeners = new Set<() => void>();
	let disposers: (() => void)[] = [];
	let fingerprint = '';

	const emit = (values: readonly unknown[], eventGeneration: number) => {
		if (eventGeneration !== generation) return;
		const next = values.flatMap((value) => normalizeWallet(value) ?? []);
		const nextFingerprint = JSON.stringify(next);
		if (nextFingerprint === fingerprint) return;
		fingerprint = nextFingerprint;
		wallets = next;
		if (
			selected &&
			!wallets.some((wallet) =>
				wallet.accounts.some((account) => account.address === selected?.address),
			)
		)
			selected = null;
		snapshot = { wallets, selected };
		for (const listener of listeners) listener();
	};

	const replaceRegistry = (next?: WalletRegistry) => {
		generation++;
		for (const dispose of disposers) dispose();
		disposers = [];
		registry = next;
		const currentGeneration = generation;
		emit(registry?.get() ?? [], currentGeneration);
		if (registry) {
			const refresh = () => emit(registry!.get(), currentGeneration);
			disposers = [registry.on('register', refresh), registry.on('unregister', refresh)];
		}
	};
	replaceRegistry(registry);

	return {
		getSnapshot: (): WalletSnapshot => snapshot,
		subscribe(listener: () => void) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		replaceRegistry,
		select(account: WalletAccount | null) {
			if (account && !wallets.some((wallet) => wallet.accounts.includes(account)))
				throw new Error('Cannot select an undiscovered wallet account');
			if (Object.is(selected, account)) return;
			selected = account;
			snapshot = { wallets, selected };
			for (const listener of listeners) listener();
		},
		dispose() {
			replaceRegistry();
			listeners.clear();
		},
	};
}
export type WalletStore = ReturnType<typeof createWalletStore>;
