import { describe, expect, it, vi } from 'vitest';
import { createWalletStore } from '../src/wallet';
import type { WalletRegistry } from '../src/wallet';

function registry(
	initial: unknown[],
): WalletRegistry & { values: unknown[]; emit(): void; disposed: ReturnType<typeof vi.fn> } {
	const listeners = new Set<() => void>();
	const disposed = vi.fn();
	return {
		values: initial,
		disposed,
		get() {
			return this.values;
		},
		on(_event, listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
				disposed();
			};
		},
		emit() {
			for (const listener of listeners) listener();
		},
	};
}
const wallet = {
	name: 'Test',
	features: {},
	accounts: [{ address: 'A', chains: ['solana:devnet'], features: ['solana:signTransaction'] }],
};

describe('wallet boundary', () => {
	it('validates, deduplicates, selects, and discards replaced-registry events', () => {
		const first = registry([wallet, { malformed: true }]);
		const second = registry([]);
		const store = createWalletStore(first);
		const listener = vi.fn();
		store.subscribe(listener);
		const initialSnapshot = store.getSnapshot();
		expect(store.getSnapshot()).toBe(initialSnapshot);
		const account = initialSnapshot.wallets[0]!.accounts[0]!;
		store.select(account);
		expect(store.getSnapshot()).not.toBe(initialSnapshot);
		expect(store.getSnapshot().selected?.address).toBe('A');
		first.emit();
		expect(listener).toHaveBeenCalledOnce();
		store.replaceRegistry(second);
		expect(first.disposed).toHaveBeenCalledTimes(2);
		first.emit();
		expect(store.getSnapshot().wallets).toEqual([]);
	});
});
