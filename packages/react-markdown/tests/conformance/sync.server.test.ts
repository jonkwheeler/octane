import type { Element, Root } from 'hast';
import type { ComponentBody } from 'octane';
import { createElement as createOctaneElement } from 'octane';
import { prerender } from 'octane/static';
import { createElement as createReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { describe, expect, it } from 'vitest';
import Markdown, { type Components, type ExtraProps } from '../../src/index';

async function octaneHtml(props: Parameters<typeof Markdown>[0]): Promise<string> {
	return (await prerender(Markdown as ComponentBody<typeof props>, props)).html
		.replace(/<!--\[-->|<!--\]-->/g, '')
		.replace(/style="([^"]*);"/g, 'style="$1"');
}

function reactHtml(props: Record<string, unknown>): string {
	return renderToStaticMarkup(createReactElement(ReactMarkdown, props)).replace(
		/<link rel="preload" as="image" href="[^"]*"\/>/g,
		'',
	);
}

describe('synchronous public projection', () => {
	it.each([
		'# heading\n\nA [safe](https://example.com) link.',
		'> quote\n\n- one\n- two\n\n`code`',
		'![alt](javascript:alert(1) "title")',
		'<i>raw</i>',
	])('matches the pristine default renderer for %j', async (children) => {
		expect(await octaneHtml({ children })).toBe(reactHtml({ children }));
	});

	it.each([
		['block quote', '> a', undefined],
		['break', 'a\\\nb', undefined],
		['indented code', '    a', undefined],
		['fenced code', '```js\na\n```', undefined],
		['delete', '~a~', [remarkGfm]],
		['emphasis', '*a*', undefined],
		['footnote', 'a[^x]\n\n[^x]: y', [remarkGfm]],
		['heading', '# a', undefined],
		['raw HTML', '<i>a</i>', undefined],
		['image', '![a](b)', undefined],
		['image title', '![a](b (c))', undefined],
		['image reference', '![a]\n\n[a]: b', undefined],
		['inline code', '`a`', undefined],
		['link', '[a](b)', undefined],
		['link title', '[a](b (c))', undefined],
		['link reference', '[a]\n\n[a]: b', undefined],
		[
			'prototype-polluting definitions',
			'[][__proto__] [][constructor]\n\n[__proto__]: a\n[constructor]: b',
			undefined,
		],
		['duplicate definitions', '[a][]\n\n[a]: b\n[a]: c', undefined],
		['unordered list', '* a', undefined],
		['ordered list', '1. a', undefined],
		['paragraph', 'a', undefined],
		['strong', '**a**', undefined],
		['table', '|a|b|\n|-|-|\n|c|d|', [remarkGfm]],
		['aligned table', '|a|b|\n|:-|-:|\n|c|d|', [remarkGfm]],
		['thematic break', '***', undefined],
		['absolute path', '[](/a)', undefined],
		['absolute URL', '[](https://example.com)', undefined],
		['uppercase protocol', '[](HTTP://example.com)', undefined],
		['javascript URL', '[](javascript:alert(1))', undefined],
		['vbscript URL', '[](vbscript:alert(1))', undefined],
		['uppercase vbscript URL', '[](VBSCRIPT:alert(1))', undefined],
		['file URL', '[](file:///tmp/a)', undefined],
		['empty URL', '[]()', undefined],
		['query URL', '[](?a:b)', undefined],
		['ampersand URL', '[](&a:b)', undefined],
		['hash URL', '[](#a:b)', undefined],
	] as const)('matches pristine sync identity: %s', async (_name, children, remarkPlugins) => {
		const props = { children, remarkPlugins };
		expect(await octaneHtml(props)).toBe(reactHtml(props));
	});

	it('matches pristine rehype-raw behavior', async () => {
		const props = { children: '<i>a</i>', rehypePlugins: [rehypeRaw] };
		expect(await octaneHtml(props)).toBe(reactHtml(props));
	});

	it('matches pristine plugin-created GFM output', async () => {
		const children = '~~delete~~\n\n| a | b |\n| - | - |\n| 1 | 2 |';
		expect(await octaneHtml({ children, remarkPlugins: [remarkGfm] })).toBe(
			reactHtml({ children, remarkPlugins: [remarkGfm] }),
		);
	});

	it('passes complete intrinsic props and node while keeping key special', async () => {
		let captured: (Record<string, unknown> & ExtraProps) | undefined;
		const Heading: ComponentBody<Record<string, unknown> & ExtraProps> = (props) => {
			captured = props;
			return createOctaneElement('section', {
				id: String(props.id),
				className: props.className,
				style: props.style,
				children: props.children,
			});
		};
		const decorate = () => (tree: Root) => {
			const heading = tree.children[0] as Element;
			heading.properties = {
				id: 'mapped',
				className: ['alpha', 'beta'],
				ariaLabel: 'label',
				dataSource: 'plugin',
				style: 'color: red; broken',
			};
		};

		const html = await octaneHtml({
			children: '# child',
			rehypePlugins: [decorate],
			components: { h1: Heading },
		});
		expect(html).toContain('<section id="mapped" class="alpha beta"');
		expect(html).toContain('>child</section>');
		expect(captured).toMatchObject({
			id: 'mapped',
			className: 'alpha beta',
			'aria-label': 'label',
			'data-source': 'plugin',
			children: 'child',
			node: { type: 'element', tagName: 'h1' },
		});
		expect(captured).not.toHaveProperty('key');
	});

	it('supports intrinsic remapping, null components, and fragments', async () => {
		expect(await octaneHtml({ children: '# title', components: { h1: 'h2' } })).toBe(
			'<h2>title</h2>',
		);
		const NullParagraph = (() => null) as unknown as ComponentBody<Record<string, unknown>>;
		expect(
			await octaneHtml({
				children: 'hidden\n\n## shown',
				components: { p: NullParagraph },
			}),
		).toBe('\n<h2>shown</h2>');
		expect(await octaneHtml({ children: '# one\n\n## two' })).toBe('<h1>one</h1>\n<h2>two</h2>');
	});

	it('preserves sibling projection and rejects invalid mappings', async () => {
		expect(await octaneHtml({ children: '- a\n- b\n- c' })).toBe(
			'<ul>\n<li>a</li>\n<li>b</li>\n<li>c</li>\n</ul>',
		);
		await expect(
			octaneHtml({ children: '# bad', components: { h1: 42 as never } }),
		).rejects.toThrow(/component|function|element/i);
	});

	it('maps every upstream-covered intrinsic family with node and stable special keys', async () => {
		const expectedTags = ['h1', 'code', 'li', 'ol', 'ul', 'tr', 'td', 'th'];
		const calls: string[] = [];
		const components: Record<string, ComponentBody<Record<string, unknown> & ExtraProps>> = {};
		for (const tag of expectedTags) {
			components[tag] = (props) => {
				calls.push(props.node?.tagName || 'missing');
				expect(props).not.toHaveProperty('key');
				const { node: _node, ...intrinsicProps } = props;
				return createOctaneElement(tag, intrinsicProps);
			};
		}
		await octaneHtml({
			children: '# heading\n\n`code`\n\n1. item\n\n- loose\n\n| a | b |\n| - | - |\n| c | d |',
			remarkPlugins: [remarkGfm],
			components: components as Components,
		});
		expect(new Set(calls)).toEqual(new Set(expectedTags));
	});

	it.each([
		['ARIA and data', { ariaDescribedBy: ['a', 'b'], dataSource: 'plugin' }],
		['comma-separated', { accept: ['image/png', 'image/jpeg'] }],
		['style and vendor prefixes', { style: 'color: red; -webkit-line-clamp: 2' }],
	] as const)(
		'matches pristine projection for plugin-created %s properties',
		async (_name, properties) => {
			const plugin = () => () => ({
				type: 'root' as const,
				children: [
					{
						type: 'element' as const,
						tagName: 'div',
						properties,
						children: [{ type: 'text' as const, value: 'value' }],
					},
				],
			});
			const props = { children: 'ignored', rehypePlugins: [plugin] };
			expect(await octaneHtml(props)).toBe(reactHtml(props));
		},
	);

	it('matches pristine SVG, comments, and root replacement', async () => {
		const plugin = () => () => ({
			type: 'element' as const,
			tagName: 'svg',
			properties: { viewBox: '0 0 10 10' },
			children: [
				{ type: 'comment' as const, value: 'ignored' },
				{
					type: 'element' as const,
					tagName: 'circle',
					properties: { cx: 5, cy: 5, r: 4 },
					children: [],
				},
			],
		});
		const props = { children: 'ignored', rehypePlugins: [plugin] };
		expect(await octaneHtml(props)).toBe(reactHtml(props));
	});
});
