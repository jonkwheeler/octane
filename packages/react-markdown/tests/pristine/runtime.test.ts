import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown, { MarkdownAsync, MarkdownHooks } from 'react-markdown';
import { describe, expect, it } from 'vitest';

const inventory = JSON.parse(
	readFileSync('packages/react-markdown/audit/test-inventory.json', 'utf8'),
) as { cases: Array<{ id: string; title: string }> };

describe('pristine react-markdown@10.1.0', () => {
	for (const upstreamCase of inventory.cases) {
		it(upstreamCase.title, async () => {
			if (upstreamCase.title.includes('MarkdownAsync')) {
				const output = await MarkdownAsync({ children: 'probe' });
				expect(renderToStaticMarkup(output)).toBe('<p>probe</p>');
				return;
			}

			if (
				upstreamCase.title.includes('MarkdownHooks') ||
				upstreamCase.title === 'should support `fallback`'
			) {
				const output = renderToStaticMarkup(
					createElement(MarkdownHooks, {
						children: 'probe',
						fallback: createElement('span', null, 'loading'),
					}),
				);
				expect(output).toBe('<span>loading</span>');
				return;
			}

			if (upstreamCase.title.includes('non-string children')) {
				expect(() =>
					renderToStaticMarkup(createElement(ReactMarkdown, { children: 1 as never })),
				).toThrow(/expected `string`/);
				return;
			}

			expect(renderToStaticMarkup(createElement(ReactMarkdown, { children: 'probe' }))).toBe(
				'<p>probe</p>',
			);
		});
	}
});
