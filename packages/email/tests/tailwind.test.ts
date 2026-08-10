import { describe, expect, it } from 'vitest';
import { render } from '../src/render.ts';
import {
	NestedTailwindBoundaries,
	TailwindEmail,
	TwoTailwindBoundaries,
} from './_fixtures/tailwind-email.tsrx';

describe('Tailwind email styling', () => {
	it('inlines utilities while preserving authored inline style precedence', async () => {
		const html = await render(TailwindEmail);
		expect(html).toContain('background-color:');
		expect(html).toContain('font-size:14px');
		expect(html).toContain('padding-top:99px');
		expect(html).toContain('padding:32px !important');
		expect(html).toContain('color:rebeccapurple');
		expect(html).toContain('Price: $1');
		expect(html).not.toContain('data-octane-email-tailwind');
	});

	it('moves responsive and pseudo utilities into the document head', async () => {
		const html = await render(TailwindEmail);
		expect(html).toMatch(/<style[^>]*>[\s\S]*@media[\s\S]*hover\\:text-red-500/);
	});

	it('isolates multiple Tailwind boundaries in one async render', async () => {
		const html = await render(TwoTailwindBoundaries);
		expect(html).toContain('padding:8px');
		expect(html).toContain('margin:12px');
	});

	it('keeps concurrent render collections independent', async () => {
		const [first, second] = await Promise.all([
			render(TailwindEmail),
			render(TwoTailwindBoundaries),
		]);
		expect(first).toContain('background-color:');
		expect(first).not.toContain('margin:12px');
		expect(second).toContain('margin:12px');
		expect(second).not.toContain('background-color:');
	});

	it('rejects nested boundaries instead of silently dropping their configuration', async () => {
		await expect(render(NestedTailwindBoundaries)).rejects.toThrow(
			'Tailwind boundaries cannot be nested',
		);
	});
});
