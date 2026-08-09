import { afterEach, describe, expect, it } from 'vitest';
import { flushSync } from 'octane';
import { ThinkingOrb } from '@octanejs/thinking-orbs';
import { flushEffects, mount } from '../../../octane/tests/_helpers';
import { ThinkingOrbRenderProbe } from '../_fixtures/render-probe.tsrx';

describe('@octanejs/thinking-orbs — render contract', () => {
	let root: ReturnType<typeof mount> | undefined;

	afterEach(() => {
		root?.unmount();
		root = undefined;
	});

	it('renders an accessible canvas for a shipped state preset', () => {
		root = mount(ThinkingOrbRenderProbe);
		flushEffects();
		flushSync(() => {});

		const canvas = root.container.querySelector('canvas[role="img"]');
		expect(canvas).not.toBeNull();
		expect(canvas?.getAttribute('aria-label')).toBe('Composing…');
		expect((canvas as HTMLCanvasElement).width).toBeGreaterThan(0);
	});

	it('moves an object consumer ref when the prop swaps after mount', () => {
		const first: { current: HTMLCanvasElement | null } = { current: null };
		const second: { current: HTMLCanvasElement | null } = { current: null };

		root = mount(ThinkingOrb, {
			state: 'working',
			theme: 'dark',
			ref: first,
		});
		flushEffects();
		flushSync(() => {});

		expect(first.current).toBeInstanceOf(HTMLCanvasElement);
		const canvas = first.current;

		root.update(ThinkingOrb, {
			state: 'working',
			theme: 'dark',
			ref: second,
		});
		flushEffects();
		flushSync(() => {});

		expect(first.current).toBeNull();
		expect(second.current).toBe(canvas);
	});
});
