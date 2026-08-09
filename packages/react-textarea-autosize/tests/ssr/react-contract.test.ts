import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
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

describe('@octanejs/react-textarea-autosize SSR React contract', () => {
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
