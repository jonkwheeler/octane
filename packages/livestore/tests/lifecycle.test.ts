import type { RegistryStoreOptions, StoreRegistry } from '@livestore/livestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetUseRcResourceCache } from '../src/useRcResource';
import { flushEffects, mount, nextPaint } from './_helpers';
import {
	ContextRegistryReader,
	MissingRegistryReader,
	OverrideRegistryReader,
	ResourceReader,
	SuspenseStoreReader,
	TwoResourceReaders,
	augmentStore,
} from './_fixtures/lifecycle.tsrx';

beforeEach(() => {
	__resetUseRcResourceCache();
});

describe('reference-counted resources', () => {
	it('reuses a resource for a stable scope/key and disposes it on last unmount', () => {
		let nextId = 0;
		const create = vi.fn(() => ({ id: ++nextId }));
		const dispose = vi.fn();
		const scope = {};
		const result = mount(TwoResourceReaders, { scope, showSecond: true, create, dispose });
		flushEffects();

		expect(result.findAll('.resource').map((node) => node.textContent)).toEqual(['1', '1']);
		expect(create).toHaveBeenCalledTimes(1);

		result.update(TwoResourceReaders, { scope, showSecond: false, create, dispose });
		expect(dispose).not.toHaveBeenCalled();

		result.unmount();
		flushEffects();
		expect(dispose).toHaveBeenCalledTimes(1);
	});

	it('disposes the previous resource when key or scope identity changes', () => {
		let nextId = 0;
		const create = vi.fn(() => ({ id: ++nextId }));
		const dispose = vi.fn();
		const firstScope = {};
		const secondScope = {};
		const result = mount(ResourceReader, {
			scope: firstScope,
			resourceKey: 'a',
			create,
			dispose,
		});
		flushEffects();

		result.update(ResourceReader, {
			scope: firstScope,
			resourceKey: 'b',
			create,
			dispose,
		});
		expect(result.find('.resource').textContent).toBe('2');
		expect(dispose).toHaveBeenCalledTimes(1);

		result.update(ResourceReader, {
			scope: secondScope,
			resourceKey: 'b',
			create,
			dispose,
		});
		expect(result.find('.resource').textContent).toBe('3');
		expect(dispose).toHaveBeenCalledTimes(2);
		result.unmount();
		flushEffects();
		expect(dispose).toHaveBeenCalledTimes(3);
	});
});

describe('registry and store lifecycle', () => {
	it('uses context, honors an explicit override, and reports missing context', () => {
		const registry = {} as StoreRegistry;
		const override = {} as StoreRegistry;
		const context = mount(ContextRegistryReader, { registry });
		expect(context.find('#registry').textContent).toBe('context');
		context.unmount();

		const overridden = mount(OverrideRegistryReader, { registry, override });
		expect(overridden.find('#registry').textContent).toBe('override');
		overridden.unmount();

		expect(() => mount(MissingRegistryReader)).toThrow(
			'useStoreRegistry() must be used within <StoreRegistryProvider>',
		);
	});

	it('suspends while loading, then retains and augments the resolved store', async () => {
		let resolve!: (store: object) => void;
		const promise = new Promise<object>((done) => {
			resolve = done;
		});
		const release = vi.fn();
		const options = { storeId: 'test' } as RegistryStoreOptions<any>;
		const store = { id: 'ready' };
		const registry = {
			getOrLoadPromise: vi.fn(() => promise),
			retain: vi.fn(() => release),
		} as unknown as StoreRegistry;
		const result = mount(SuspenseStoreReader, { registry, options });

		expect(result.find('#fallback').textContent).toBe('loading');
		resolve(store);
		(registry.getOrLoadPromise as ReturnType<typeof vi.fn>).mockReturnValue(store);
		await nextPaint();
		await Promise.resolve();
		await nextPaint();
		expect(result.find('#store').textContent).toBe('ready');

		flushEffects();
		expect(registry.retain).toHaveBeenCalledWith(options);
		expect(augmentStore(store)).toBe(store);
		expect(store).toHaveProperty('useQuery');
		expect(store).toHaveProperty('useClientDocument');
		expect(store).toHaveProperty('useSyncStatus');

		result.unmount();
		flushEffects();
		expect(release).toHaveBeenCalledTimes(1);
	});
});
