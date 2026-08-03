import type { Root } from 'hast';
import { Writable } from 'node:stream';
import type { ComponentBody, ElementDescriptor } from 'octane';
import { createElement } from 'octane';
import { prerender } from 'octane/static';
import { createElement as createReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderToPipeableStream } from 'react-dom/server';
import { MarkdownAsync as ReactMarkdownAsync } from 'react-markdown';
import rehypeStarryNight from 'rehype-starry-night';
import { describe, expect, it } from 'vitest';
import { MarkdownAsync, type Components } from '../../src/index';

function normalize(html: string): string {
	return html
		.replace(/<!--\[-->|<!--\]-->/g, '')
		.replace(/style="([^"]*);"/g, 'style="$1"')
		.replace(/<link rel="preload" as="image" href="[^"]*"\/>/g, '');
}

async function renderOctane(element: ElementDescriptor): Promise<string> {
	const Root = (() => element) as unknown as ComponentBody;
	return normalize((await prerender(Root, {})).html);
}

describe('MarkdownAsync', () => {
	it('documents the synchronous-render framework divergence with the upstream fixture', async () => {
		expect(() =>
			renderToStaticMarkup(createReactElement(ReactMarkdownAsync, { children: 'a' })),
		).toThrow(/A component suspended while responding to synchronous input/);
		const pending = MarkdownAsync({ children: 'a' });
		expect(pending).toBeInstanceOf(Promise);
		expect(await renderOctane(await pending)).toBe('<p>a</p>');
	});

	it('matches the upstream pipeable-stream output fixture', async () => {
		const react = await new Promise<string>((resolve, reject) => {
			let html = '';
			const stream = renderToPipeableStream(
				createReactElement(ReactMarkdownAsync, { children: 'a' }),
				{ onError: reject },
			);
			stream.pipe(
				new Writable({
					write(chunk, _encoding, callback) {
						html += chunk.toString();
						callback();
					},
					final(callback) {
						resolve(html);
						callback();
					},
				}),
			);
		});
		expect(react).toBe('<p>a</p>');
		expect(await renderOctane(await MarkdownAsync({ children: 'a' }))).toBe('<p>a</p>');
	});

	it('matches exact starry-night highlighted HTML for the upstream fixture', async () => {
		const props = {
			children: '```js\nconsole.log(3.14)',
			rehypePlugins: [rehypeStarryNight],
		};
		const expected =
			'<pre><code class="language-js"><span class="pl-en">console</span>.<span class="pl-c1">log</span>(<span class="pl-c1">3.14</span>)\n</code></pre>';
		expect(renderToStaticMarkup(await ReactMarkdownAsync(props))).toBe(expected);
		expect(await renderOctane(await MarkdownAsync(props))).toBe(expected);
	});

	it('matches pristine async plugin ordering and resolved output', async () => {
		const calls: string[] = [];
		const plugin = (name: string, wait: number) => () => async (tree: Root) => {
			await new Promise((resolve) => setTimeout(resolve, wait));
			calls.push(name);
			tree.children.push({ type: 'text', value: name });
		};
		const props = {
			children: '# async',
			remarkPlugins: [plugin('remark', 2)],
			rehypePlugins: [plugin('rehype', 1)],
		};
		const octane = await MarkdownAsync(props);
		expect(calls).toEqual(['remark', 'rehype']);
		calls.length = 0;
		const react = await ReactMarkdownAsync(props);
		expect(await renderOctane(octane)).toBe(renderToStaticMarkup(react));
		expect(calls).toEqual(['remark', 'rehype']);
	});

	it('rejects async plugin failures with the pristine error', async () => {
		const failure = new Error('async-plugin-failure');
		const plugin = () => async () => {
			await Promise.resolve();
			throw failure;
		};
		await expect(MarkdownAsync({ children: 'x', rehypePlugins: [plugin] })).rejects.toBe(failure);
		await expect(ReactMarkdownAsync({ children: 'x', rehypePlugins: [plugin] })).rejects.toBe(
			failure,
		);
	});

	it('keeps synchronous throws distinct from asynchronous rejection', () => {
		const pending = MarkdownAsync({ children: 123 as never });
		expect(pending).toBeInstanceOf(Promise);
		return expect(pending).rejects.toThrow(
			'Unexpected value `123` for `children` prop, expected `string`',
		);
	});

	it('awaits promise-returning mapped components and their nested children', async () => {
		const AsyncHeading = async (props: Record<string, unknown>) => {
			await Promise.resolve();
			return createElement('section', {
				id: 'mapped-async',
				children: createElement('strong', { children: props.children }),
			});
		};
		const element = await MarkdownAsync({
			children: '# nested',
			components: { h1: AsyncHeading } as unknown as Components,
		});
		const html = await renderOctane(element);
		expect(html).toContain('<section id="mapped-async"><strong>nested</strong></section>');
		expect(html).toContain('data-octane-suspense');
	});

	it('propagates promise-returning mapped-component rejection', async () => {
		const RejectedHeading = async () => {
			throw new Error('mapped-component-rejection');
		};
		const element = await MarkdownAsync({
			children: '# rejected',
			components: { h1: RejectedHeading } as unknown as Components,
		});
		await expect(renderOctane(element)).rejects.toThrow('mapped-component-rejection');
	});
});
