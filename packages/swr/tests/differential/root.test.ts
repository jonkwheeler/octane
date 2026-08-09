import { describe, expect, it, vi } from 'vitest';
import { createRoot, drainPassiveEffects, flushSync } from 'octane';
import * as rootBinding from '../../src/index/index';
import { cache } from '../../src/_internal/index';
import { renderTrace, SWRReader } from '../upstream/root/fixtures.tsrx';

async function settle() {
	for (let index = 0; index < 8; index++) {
		await Promise.resolve();
		flushSync(() => {});
		drainPassiveEffects();
	}
}

describe('SWR U3 pinned React/Octane root trace', () => {
	// @parity-case differential:root-surface
	it('preserves the exact pinned root runtime surface', () => {
		expect(Object.keys(rootBinding).sort()).toEqual([
			'SWRConfig',
			'default',
			'mutate',
			'preload',
			'unstable_serialize',
			'useSWRConfig',
		]);
	});

	// @parity-case differential:root-trace
	it('matches request-state and callback ordering', async () => {
		renderTrace.length = 0;
		const callbacks: string[] = [];
		const fetcher = vi.fn(async () => 'data');
		const container = document.createElement('div');
		const root = createRoot(container);
		root.render(SWRReader, {
			cacheKey: 'differential-root',
			fetcher,
			config: {
				onSuccess: () => callbacks.push('success'),
				onError: () => callbacks.push('error'),
			},
		});
		flushSync(() => {});
		drainPassiveEffects();
		await settle();

		const distinct = renderTrace.filter(
			(value, index, values) =>
				index === 0 || JSON.stringify(value) !== JSON.stringify(values[index - 1]),
		);
		expect(distinct).toEqual([
			{ data: undefined, error: undefined, isLoading: true, isValidating: true },
			{ data: 'data', error: undefined, isLoading: false, isValidating: false },
		]);
		expect(callbacks).toEqual(['success']);
		expect(fetcher).toHaveBeenCalledOnce();
		root.unmount();
		cache.clear();
	});
});
