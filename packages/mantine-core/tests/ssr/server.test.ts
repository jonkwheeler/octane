import { describe, expect, it } from 'vitest';
import { renderToString } from 'octane/server';
import { ServerCore } from '../_fixtures/server-core.tsrx';

describe('@octanejs/mantine-core server behavior', () => {
	it('renders provider styles and components deterministically', () => {
		const first = renderToString(ServerCore).html;
		const second = renderToString(ServerCore).html;

		expect(first).toBe(second);
		expect(first).toContain('Server button');
		expect(first).toContain('12,345');
		expect(first).toContain('data-mantine-styles');
	});
});
