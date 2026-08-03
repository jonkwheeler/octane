import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'octane/server';
import OctaneTextareaAutosize from '../../src/index.tsrx';
import ReactTextareaAutosize from '../../upstream/src/index.tsx';

const style = {
	boxSizing: 'border-box' as const,
	fontSize: '16px',
	height: 55,
	lineHeight: '20px',
	width: '120px',
};

describe('@octanejs/react-textarea-autosize SSR', () => {
	// @parity-case ssr:plain-textarea
	it('renders textarea attributes and the caller-owned initial style without browser globals', () => {
		const onChange = vi.fn();
		const onHeightChange = vi.fn();
		const { html } = renderToString(OctaneTextareaAutosize, {
			'aria-label': 'Message',
			defaultValue: 'hello',
			maxRows: 8,
			minRows: 2,
			onChange,
			onHeightChange,
			placeholder: 'Write something',
			style,
		});

		expect(html).toContain('<textarea');
		expect(html).toContain('aria-label="Message"');
		expect(html).toContain('placeholder="Write something"');
		expect(html).toContain('height:55px');
		expect(html).toContain('hello');
		expect(html).not.toContain('minRows');
		expect(html).not.toContain('maxRows');
		expect(onChange).not.toHaveBeenCalled();
		expect(onHeightChange).not.toHaveBeenCalled();
	});

	// @parity-case ssr:react-contract
	it('matches the pristine React server-visible contract', () => {
		const props = {
			'aria-describedby': 'message-help',
			defaultValue: 'hello',
			name: 'message',
			placeholder: 'Write something',
			rows: 3,
			style,
		};
		const octane = renderToString(OctaneTextareaAutosize, props).html;
		const react = renderToStaticMarkup(createElement(ReactTextareaAutosize, props));

		for (const fragment of [
			'aria-describedby="message-help"',
			'name="message"',
			'placeholder="Write something"',
			'rows="3"',
			'height:55px',
			'hello',
		]) {
			expect(octane, fragment).toContain(fragment);
			expect(react, fragment).toContain(fragment);
		}
	});
});
