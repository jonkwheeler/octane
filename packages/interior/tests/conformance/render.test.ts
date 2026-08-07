import { afterEach, describe, expect, it } from 'vitest';
import { flushSync } from 'octane';
import { flushEffects, mount } from '../../../octane/tests/_helpers';
import { CopyButtonRenderProbe } from '../_fixtures/render-probe.tsrx';

describe('@octanejs/interior — render contract', () => {
	let root: ReturnType<typeof mount> | undefined;

	afterEach(function cleanup() {
		root?.unmount();
		root = undefined;
	});

	it('renders a copy button with default label', () => {
		root = mount(CopyButtonRenderProbe);
		flushEffects();
		flushSync(function flush() {});

		const button = root.container.querySelector('button');
		expect(button).not.toBeNull();
		expect(button?.textContent).toContain('Copy');
	});
});
