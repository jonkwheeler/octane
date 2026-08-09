/**
 * Parity-owned Octane suspense adaptation: the documented @pending loading
 * lifecycle for a suspense query. Kept in its own file so ordinary conformance
 * cases in suspense.test.ts stay on the regular CI shards.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { QueryClient } from '@octanejs/tanstack-query';
import { mount, nextPaint } from '../_helpers';
import { SuspenseApp } from '../_fixtures/suspense.tsrx';

let client: QueryClient;
beforeEach(() => {
	client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	client.mount();
});

async function flush() {
	for (let i = 0; i < 6; i++) {
		await new Promise((r) => setTimeout(r, 0));
		await nextPaint();
	}
}

describe('suspense query', () => {
	// @parity-case adapted:tanstack-query-suspense
	it('shows @pending while loading, then the data', async () => {
		let resolveFn: (v: string) => void = () => {};
		const queryFn = () => new Promise<string>((res) => (resolveFn = res));
		const r = mount(SuspenseApp, { client, queryFn });
		// First render suspends → @pending fallback.
		expect(r.find('#fallback').textContent).toBe('loading');
		await flush();
		resolveFn('ready');
		await flush();
		expect(r.find('#data').textContent).toBe('data:ready');
		r.unmount();
	});
});
