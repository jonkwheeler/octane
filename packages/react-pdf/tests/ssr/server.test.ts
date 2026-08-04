import { renderToString } from 'octane/server';
import { describe, expect, it } from 'vitest';

import { ServerDocumentFixture, ServerNoDataFixture } from './server-fixture.tsrx';

describe('@octanejs/react-pdf server contract', () => {
	it('renders deterministic loading markup without evaluating browser APIs', () => {
		expect('window' in globalThis).toBe(false);
		expect('document' in globalThis).toBe(false);
		expect('Worker' in globalThis).toBe(false);

		const first = renderToString(ServerDocumentFixture).html;
		const second = renderToString(ServerDocumentFixture).html;
		expect(second).toBe(first);
		expect(first).toContain('react-pdf__Document');
		expect(first).toContain('react-pdf__message--loading');
		expect(first).toContain('Loading PDF…');
		expect(first).not.toContain('canvas');
	});

	it('preserves the upstream no-data shell and composed class', () => {
		const { html } = renderToString(ServerNoDataFixture);
		expect(html).toContain('react-pdf__Document custom-document');
		expect(html).toContain('react-pdf__message--no-data');
		expect(html).toContain('Choose a PDF');
	});
});
