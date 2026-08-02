import { describe, expect, it } from 'vitest';
import { renderToString } from 'octane/server';
import { PersistenceHydrationFixture } from '../_fixtures/persistence-hydration.tsrx';

describe('react-resizable-panels persistence SSR', () => {
	it('renders deterministic defaults without resolving or reading browser storage', () => {
		const storage = {
			getItem(): never {
				throw new Error('storage must not be read during server render');
			},
			setItem(): never {
				throw new Error('storage must not be written during server render');
			},
		};

		const first = renderToString(PersistenceHydrationFixture, { storage }).html;
		const second = renderToString(PersistenceHydrationFixture, { storage }).html;
		expect(first).toBe(second);
		expect(first).toContain('data-layout="default"');
	});
});
