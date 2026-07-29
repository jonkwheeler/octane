import { describe, expect, it } from 'vitest';
import { createWalletStore } from '../src/wallet';

describe('server boundary', () => {
	it('does not perform wallet discovery without an explicitly provided browser registry', () => {
		const store = createWalletStore();
		expect(store.getSnapshot()).toEqual({ selected: null, wallets: [] });
	});
});
