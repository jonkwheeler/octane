import { describe, expect, it } from 'vitest';
import { renderToString } from 'octane/server';
import { ServerHooks } from '../_fixtures/server-hooks.tsrx';

describe('@octanejs/mantine-hooks server behavior', () => {
	it('renders deterministic initial state without a browser', () => {
		const first = renderToString(ServerHooks).html;
		const second = renderToString(ServerHooks).html;

		expect(first).toBe(second);
		expect(first).toContain('2:open:Ada,Grace:narrow');
	});
});
