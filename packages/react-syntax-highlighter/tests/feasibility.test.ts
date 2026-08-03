import { afterEach, describe, expect, it } from 'vitest';
import { createElement } from 'octane';
import { flushEffects, mount } from '../../octane/tests/_helpers';
import SyntaxHighlighter, {
	Light,
	LightAsync,
	PrismLight,
	createElement as createSyntaxElement,
} from '../src/index.js';

const mounted: Array<{ unmount(): void }> = [];
afterEach(() => {
	while (mounted.length > 0) mounted.pop()?.unmount();
});

describe('react-syntax-highlighter feasibility gate', () => {
	it('preserves the root export and static-member contract', () => {
		expect(typeof SyntaxHighlighter).toBe('function');
		expect(SyntaxHighlighter.supportedLanguages).toContain('javascript');
		expect(typeof Light.registerLanguage).toBe('function');
		expect(typeof PrismLight.registerLanguage).toBe('function');
		expect(typeof PrismLight.alias).toBe('function');
		expect(typeof LightAsync.preload).toBe('function');
		expect(typeof createSyntaxElement).toBe('function');
	});

	it('renders highlighted HAST through dynamic native tags', () => {
		const result = mount(SyntaxHighlighter, {
			language: 'javascript',
			children: 'const answer = 42;',
			useInlineStyles: false,
			'data-testid': 'syntax',
		});
		mounted.push(result);

		const pre = result.find('[data-testid="syntax"]');
		expect(pre.tagName).toBe('PRE');
		expect(pre.querySelector('code')?.textContent).toBe('const answer = 42;');
		expect(pre.querySelector('.hljs-keyword')?.textContent).toBe('const');
	});

	it('supports component-valued tags and a custom renderer', () => {
		function Pre(props: Record<string, unknown>) {
			return createElement('section', { ...props, 'data-pre': 'custom' });
		}
		function Code(props: Record<string, unknown>) {
			return createElement('samp', { ...props, 'data-code': 'custom' });
		}

		const result = mount(SyntaxHighlighter, {
			language: 'javascript',
			children: 'let x = 1;',
			PreTag: Pre,
			CodeTag: Code,
			renderer: ({ rows, stylesheet, useInlineStyles }: any) =>
				rows.map((node: any, index: number) =>
					createSyntaxElement({
						node,
						stylesheet,
						useInlineStyles,
						key: `custom-${index}`,
					}),
				),
		});
		mounted.push(result);

		expect(result.find('[data-pre="custom"]').tagName).toBe('SECTION');
		expect(result.find('[data-code="custom"]').tagName).toBe('SAMP');
		expect(result.container.textContent).toBe('let x = 1;');
	});

	it('does not update an unmounted async highlighter when loading settles', async () => {
		const result = mount(LightAsync, { language: 'javascript', children: 'const x = 1;' });
		mounted.push(result);
		flushEffects();
		result.unmount();
		mounted.pop();

		await LightAsync.preload();
		await Promise.resolve();
		expect(result.container.innerHTML).toBe('');
	});
});
