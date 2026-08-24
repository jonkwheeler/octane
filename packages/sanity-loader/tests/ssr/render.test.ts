import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'octane/server';
import { InitialQuery } from '../_fixtures/initial-query.tsrx';

describe('@octanejs/sanity-loader — SSR', () => {
	it('renders the initial query snapshot without a browser client', () => {
		const result = renderToStaticMarkup(InitialQuery);
		expect(result.html).toBe('<output data-loading="false">Octane and Sanity</output>');
	});
});
