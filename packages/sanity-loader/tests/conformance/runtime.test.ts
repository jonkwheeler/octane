import { describe, expect, it, vi } from 'vitest';
import * as sanityLoader from '@octanejs/sanity-loader';
import * as upstream from '@sanity/react-loader';
import { mount } from '../../../octane/tests/_helpers.js';
import { createQueryStore as createClientQueryStore } from '../../src/createQueryStore/client-only';
import { createQueryStore as createServerQueryStore } from '../../src/createQueryStore/server-only';
import { defineStudioUrlStore } from '../../src/defineStudioUrlStore';
import { InitialQuery } from '../_fixtures/initial-query.tsrx';
import { OptionalQueryArguments } from '../_fixtures/optional-query-arguments.tsrx';

describe('@octanejs/sanity-loader — runtime', () => {
	it('matches the upstream root runtime export names', () => {
		expect(Object.keys(sanityLoader).sort()).toEqual(Object.keys(upstream).sort());
	});

	it('hydrates useQuery from initial data', () => {
		const mounted = mount(InitialQuery);
		expect(mounted.find('output').textContent).toBe('Octane and Sanity');
		expect(mounted.find('output').getAttribute('data-loading')).toBe('false');
		mounted.unmount();
	});

	it('accepts omitted options from compiled components', () => {
		const mounted = mount(OptionalQueryArguments);
		const expected = 'The `initial` option is required when `ssr: true`';
		expect(mounted.find('[data-call="query-only"]').textContent).toBe(expected);
		expect(mounted.find('[data-call="query-with-params"]').textContent).toBe(expected);
		mounted.unmount();
	});

	it('notifies studio URL subscribers and preserves the server snapshot', () => {
		const store = defineStudioUrlStore(false);
		const subscriber = vi.fn();
		const unsubscribe = store.subscribe(subscriber);
		store.setStudioUrl('https://octane.sanity.studio');
		expect(store.getSnapshot()).toBe('https://octane.sanity.studio');
		expect(store.getServerSnapshot()).toBeUndefined();
		expect(subscriber).toHaveBeenCalledOnce();
		unsubscribe();
		store.setStudioUrl(undefined);
		expect(subscriber).toHaveBeenCalledOnce();
	});

	it('enforces browser and server entry boundaries', () => {
		const browserStore = createClientQueryStore({ client: false, ssr: true });
		expect(() => browserStore.loadQuery('*[]')).toThrow('server only');
		expect(() => browserStore.setServerClient(false)).toThrow('server only');
		expect(() => createServerQueryStore({ client: false, ssr: false })).toThrow(
			'`ssr` option must be `true`',
		);
	});
});
