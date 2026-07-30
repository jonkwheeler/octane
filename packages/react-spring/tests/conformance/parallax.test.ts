import { describe, expect, it, vi } from 'vitest';
import { flushEffects, mount } from '../../../octane/tests/_helpers';
import type { IParallax } from '../../src/parallax.tsrx';
import { ParallaxFixture } from '../_fixtures/parallax.tsrx';

describe('Parallax', () => {
	it('positions normal and sticky layers and exposes imperative scrolling', () => {
		const disconnect = vi.fn();
		vi.stubGlobal(
			'ResizeObserver',
			class {
				observe() {}
				disconnect() {
					disconnect();
				}
			},
		);
		const api = { current: null as IParallax | null };
		const result = mount(ParallaxFixture, { api, horizontal: false, enabled: true });
		flushEffects();
		const container = result.find('#parallax') as HTMLElement;
		Object.defineProperty(container, 'clientHeight', { value: 200 });
		api.current!.update();

		expect((result.find('#normal-layer') as HTMLElement).style.transform).toBe(
			'translate3d(0,200px,0)',
		);
		api.current!.scrollTo(1);
		expect(container.scrollTop).toBe(200);
		expect((result.find('#normal-layer') as HTMLElement).style.transform).toBe(
			'translate3d(0,100px,0)',
		);
		expect((result.find('#sticky-layer') as HTMLElement).style.transform).toBe(
			'translate3d(0,0px,0)',
		);

		result.unmount();
		expect(disconnect).toHaveBeenCalled();
	});
});
