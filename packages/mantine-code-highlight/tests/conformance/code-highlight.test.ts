import { describe, expect, it } from 'vitest';
import { mount } from '../../../octane/tests/_helpers';
import { CodeHighlightApp } from '../_fixtures/code-highlight.tsrx';

describe('@octanejs/mantine-code-highlight', () => {
	it('renders block and inline code through the default adapter', () => {
		window.matchMedia = () =>
			({
				matches: false,
				addEventListener() {},
				removeEventListener() {},
			}) as unknown as MediaQueryList;
		const result = mount(CodeHighlightApp, {});
		expect(result.container.textContent).toContain('const answer = 42;');
		expect(result.container.textContent).toContain('npm install octane');
		expect(result.container.querySelector('pre code')).not.toBeNull();
		result.unmount();
	});
});
