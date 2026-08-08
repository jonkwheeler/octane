import { expectTypeOf, test } from 'vitest';
import type { StoreRegistry } from '@livestore/livestore';
import type { OctaneNode } from 'octane';
import {
	LiveList,
	type LiveListProps,
	StoreRegistryContext,
	StoreRegistryProvider,
	captureStackInfo,
	storeOptions,
	useClientDocument,
	useQuery,
	useQueryRef,
	useStore,
	useStoreRegistry,
	useSyncStatus,
	withReactApi,
} from '../src/mod';
import * as experimental from '../src/experimental/mod';

test('exports the pinned stable and experimental surfaces', function exportSurface() {
	expectTypeOf(StoreRegistryContext).toBeObject();
	expectTypeOf(StoreRegistryProvider).toBeFunction();
	expectTypeOf(useStoreRegistry).toBeFunction();
	expectTypeOf(useStore).toBeFunction();
	expectTypeOf(useQuery).toBeFunction();
	expectTypeOf(useQueryRef).toBeFunction();
	expectTypeOf(useClientDocument).toBeFunction();
	expectTypeOf(useSyncStatus).toBeFunction();
	expectTypeOf(withReactApi).toBeFunction();
	expectTypeOf(storeOptions).toBeFunction();
	expectTypeOf(captureStackInfo).toBeFunction();
	expectTypeOf(LiveList).toEqualTypeOf(experimental.LiveList);
});

test('uses Octane renderables and preserves registry override inference', function octaneRenderableTypes() {
	type ProviderProps = Parameters<typeof StoreRegistryProvider>[0];
	expectTypeOf<ProviderProps['children']>().toEqualTypeOf<OctaneNode | undefined>();

	const registry = null as unknown as StoreRegistry;
	expectTypeOf(useStoreRegistry(registry)).toEqualTypeOf<StoreRegistry>();
	expectTypeOf<LiveListProps<any>['items$']>().not.toBeAny();
});

test('rejects invalid public call shapes', function negativeControls() {
	// @ts-expect-error storeOptions requires a store definition object
	storeOptions(null);

	// @ts-expect-error useSyncStatus requires a store option
	useSyncStatus({});

	// @ts-expect-error LiveList props require items$
	const missingItems$: LiveListProps<any> = {
		getKey: function getKey() {
			return 'id';
		},
		renderItem: function renderItem() {
			return null;
		},
		store: null as any,
	};
	void missingItems$;
});
