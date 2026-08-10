import { describe, expect, it } from 'vitest';
import { render } from '../src/index.ts';
import {
	CodeBlockEmail,
	InvalidCodeBlockEmail,
	MarkdownEmail,
} from './_fixtures/rich-content.tsrx';

describe('rich email content', () => {
	it('renders styled Markdown through the public API', async () => {
		const html = await render(MarkdownEmail);

		expect(html).toContain('<div data-id="react-email-markdown">');
		expect(html).toContain(
			'<h1 style="font-weight:500;padding-top:20px;font-size:2.5rem">Hello</h1>',
		);
		expect(html).toContain('<p style="color:#123456">This is <strong');
		expect(html).toContain('href="https://octanejs.dev" target="_blank"');
		expect(html).toContain('<ul>');
		expect(html).toContain('<li>First</li>');
	});

	it('renders syntax-highlighted code with optional line numbers', async () => {
		const html = await render(CodeBlockEmail);

		expect(html).toContain('<pre style="');
		expect(html).toContain('background:#1e1e1e');
		expect(html).toContain('>1</span>');
		expect(html).toContain('>2</span>');
		expect(html).toContain('color:#569cd6');
		expect(html).toContain('const');
		expect(html).toContain('answer');
	});

	it('rejects Prism languages that are not available', async () => {
		await expect(render(InvalidCodeBlockEmail)).rejects.toThrow(
			'CodeBlock: There is no language defined on Prism called not-a-language',
		);
	});
});
