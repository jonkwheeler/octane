import { describe, expect, it, vi } from 'vitest';
import * as octane from '../../src/_internal/index';
import { stableHash as reactStableHash } from '../../upstream/src/_internal/utils/hash';
import { mergeConfigs as reactMergeConfigs } from '../../upstream/src/_internal/utils/merge-config';
import { serialize as reactSerialize } from '../../upstream/src/_internal/utils/serialize';

const candidates = [
	'',
	'key',
	['tuple', 1, false],
	{ z: undefined, nested: { b: 2, a: 1 } },
	new Date(1234),
	/swr/,
];

function cacheTrace() {
	const provider = new Map();
	const context = octane.initCache(provider)!;
	const [get, set, subscribe] = octane.createCacheHelper(provider, 'key');
	const callbacks: unknown[] = [];
	const unsubscribe = subscribe('key', (current, previous) => {
		callbacks.push([current, previous]);
	});
	set({ data: 1 });
	set({ error: 'boom' });
	unsubscribe();
	set({ data: 2 });
	const result = { snapshot: get(), callbacks };
	context[3]?.();
	return result;
}

describe('SWR U2 React/Octane differential traces', () => {
	it('matches the pinned serialization and config oracle', () => {
		for (const candidate of candidates) {
			expect(octane.serialize(candidate)).toEqual(reactSerialize(candidate));
			expect(octane.stableHash(candidate)).toEqual(reactStableHash(candidate));
		}
		const parent = { fallback: { a: 1 }, use: [vi.fn()] };
		const child = { fallback: { b: 2 }, use: [vi.fn()] };
		expect(octane.mergeConfigs(parent, child)).toEqual(reactMergeConfigs(parent, child));
	});

	it('matches cache snapshots and callback logs', () => {
		expect(cacheTrace()).toEqual({
			snapshot: { data: 2, error: 'boom' },
			callbacks: [
				[{ data: 1 }, {}],
				[{ data: 1, error: 'boom' }, { data: 1 }],
			],
		});
	});
});
