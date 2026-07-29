import { describe, expect, it, vi } from 'vitest';
import { createClientStore } from '../src/client-store';

function client() {
	let notify = () => {};
	const unsubscribe = vi.fn();
	return {
		subscribe(listener: () => void) {
			notify = listener;
			return unsubscribe;
		},
		notify: () => notify(),
		unsubscribe,
	};
}

describe('client store', () => {
	it('replaces a client, cleans up the old subscription, and ignores its generation', () => {
		const first = client();
		const second = client();
		const store = createClientStore(first);
		const listener = vi.fn();
		store.subscribe(listener);
		store.setClient(second);
		expect(first.unsubscribe).toHaveBeenCalledOnce();
		expect(listener).toHaveBeenCalledOnce();
		first.notify();
		expect(listener).toHaveBeenCalledOnce();
		second.notify();
		expect(listener).toHaveBeenCalledTimes(2);
		store.dispose();
		expect(second.unsubscribe).toHaveBeenCalledOnce();
	});
});
