export type Cleanup = () => void;
export type ReactiveClient<TClient> = TClient & {
	subscribe?: (listener: () => void) => Cleanup | { unsubscribe(): void };
};

export interface ClientStore<TClient> {
	dispose(): void;
	getSnapshot(): TClient;
	getVersion(): number;
	setClient(client: TClient): void;
	subscribe(listener: () => void): Cleanup;
}

export function createClientStore<TClient>(initialClient: TClient): ClientStore<TClient> {
	let client = initialClient;
	let generation = 0;
	let version = 0;
	const listeners = new Set<() => void>();
	let cleanup: Cleanup | undefined;

	const bind = () => {
		const boundGeneration = ++generation;
		const result = (client as ReactiveClient<TClient>).subscribe?.(() => {
			if (boundGeneration !== generation) return;
			version++;
			for (const listener of listeners) listener();
		});
		cleanup =
			typeof result === 'function' ? result : result ? () => result.unsubscribe() : undefined;
	};
	bind();

	return {
		dispose() {
			generation++;
			cleanup?.();
			cleanup = undefined;
			listeners.clear();
		},
		getSnapshot: () => client,
		getVersion: () => version,
		setClient(nextClient) {
			if (Object.is(client, nextClient)) return;
			generation++;
			cleanup?.();
			client = nextClient;
			version++;
			bind();
			for (const listener of listeners) listener();
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}
