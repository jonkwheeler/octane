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

	it('invokes a callback consumer ref once on mount and once on unmount', () => {
		const calls: Array<HTMLCanvasElement | null> = [];
		function onRef(node: HTMLCanvasElement | null): void {
			calls.push(node);
		}

		root = mount(ThinkingOrb, {
			state: 'working',
			theme: 'dark',
			ref: onRef,
		});
		flushEffects();
		flushSync(() => {});

		expect(calls).toHaveLength(1);
		expect(calls[0]).toBeInstanceOf(HTMLCanvasElement);

		root.unmount();
		root = undefined;
		flushEffects();
		flushSync(() => {});

		expect(calls).toHaveLength(2);
		expect(calls[1]).toBeNull();
	});

	it('runs a cleanup returned by a callback consumer ref instead of calling it with null', () => {
		const calls: Array<HTMLCanvasElement | null | 'cleanup'> = [];
		function onRef(node: HTMLCanvasElement | null): (() => void) | void {
			calls.push(node);
			if (node !== null) {
				return function cleanupRef(): void {
					calls.push('cleanup');
				};
			}
		}

		root = mount(ThinkingOrb, {
			state: 'working',
			theme: 'dark',
			ref: onRef,
		});
		flushEffects();
		flushSync(() => {});

		expect(calls).toHaveLength(1);
		expect(calls[0]).toBeInstanceOf(HTMLCanvasElement);

		root.unmount();
		root = undefined;
		flushEffects();
		flushSync(function flushUnmount(): void {});

		expect(calls).toHaveLength(2);
		expect(calls[1]).toBe('cleanup');
	});
});
