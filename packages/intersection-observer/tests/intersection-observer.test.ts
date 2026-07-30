import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushEffects, mount } from '../../octane/tests/_helpers';
import {
	destroyIntersectionMocking,
	intersectionMockInstance,
	mockIsIntersecting,
	setupIntersectionMocking,
} from '../src/test-utils';
import { observe } from '../src/observe';
import { ComponentProbe, EffectProbe, HookProbe } from './_fixtures/probes.tsrx';

beforeEach(() => setupIntersectionMocking(vi.fn));
afterEach(() => {
	destroyIntersectionMocking();
	document.body.replaceChildren();
});

describe('observe', () => {
	it('pools matching options and disconnects after the final subscriber', () => {
		const first = document.createElement('div');
		const second = document.createElement('div');
		const stopFirst = observe(first, vi.fn(), { threshold: 0.5 });
		const stopSecond = observe(second, vi.fn(), { threshold: 0.5 });
		const observer = intersectionMockInstance(first);
		expect(intersectionMockInstance(second)).toBe(observer);
		stopFirst();
		expect(observer.unobserve).toHaveBeenCalledWith(first);
		expect(observer.disconnect).not.toHaveBeenCalled();
		stopSecond();
		expect(observer.disconnect).toHaveBeenCalledOnce();
	});
});

describe('Octane binding', () => {
	it('updates useInView and skips the initial false notification', () => {
		const onChange = vi.fn();
		const result = mount(HookProbe, { onChange });
		flushEffects();
		const target = result.find('[data-testid="target"]');
		expect(target.textContent).toBe('hidden');
		mockIsIntersecting(target, false);
		expect(onChange).not.toHaveBeenCalled();
		mockIsIntersecting(target, true);
		expect(target.textContent).toBe('visible');
		expect(target.getAttribute('data-entry')).toBe('yes');
		expect(onChange).toHaveBeenCalledWith(true, expect.objectContaining({ target }));
		result.unmount();
	});

	it('stops observing after triggerOnce enters', () => {
		const result = mount(HookProbe, { triggerOnce: true });
		flushEffects();
		const target = result.find('[data-testid="target"]');
		const observer = intersectionMockInstance(target);
		mockIsIntersecting(target, true);
		expect(observer.unobserve).toHaveBeenCalledWith(target);
		expect(target.textContent).toBe('visible');
		result.unmount();
	});

	it('runs useOnInView without a visibility rerender contract', () => {
		const onChange = vi.fn();
		const result = mount(EffectProbe, { onChange });
		const target = result.find('[data-testid="effect"]');
		mockIsIntersecting(target, true);
		expect(onChange).toHaveBeenCalledOnce();
		result.unmount();
	});

	it('supports the InView render-prop form and ref', () => {
		const result = mount(ComponentProbe);
		flushEffects();
		const target = result.find('[data-testid="component"]');
		expect(target.tagName).toBe('SECTION');
		expect(target.textContent).toBe('outside');
		mockIsIntersecting(target, true);
		expect(target.textContent).toBe('inside');
		result.unmount();
	});
});
