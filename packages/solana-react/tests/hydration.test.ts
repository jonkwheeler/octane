import { describe, expect, it } from 'vitest';
import { createWalletStore } from '../src/wallet';

describe('hydration activation', () => {
	it('keeps the empty server snapshot stable until a registry is attached', () => {
		const store = createWalletStore();
		const before = store.getSnapshot();
		store.replaceRegistry({ get: () => [], on: () => () => {} });
		expect(store.getSnapshot()).toEqual(before);
	});
});
