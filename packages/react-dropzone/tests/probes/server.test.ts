import { describe, expect, it } from 'vitest';
import { renderToReadableStream, renderToString } from 'octane/server';
import { HookProbe } from './dropzone.tsrx';

describe('react-dropzone U1 server gate', () => {
	it('renders without browser globals and streams deterministic root/input shape', async () => {
		const props = { options: { disabled: true }, rootRef: null, inputRef: null };
		const { html } = renderToString(HookProbe, props);
		expect(html).toContain('data-probe="root"');
		expect(html).toContain('data-probe="input"');
		const stream = await renderToReadableStream(HookProbe, props);
		const streamed = await new Response(stream).text();
		expect(streamed).toContain('data-probe="input"');
	});
});
