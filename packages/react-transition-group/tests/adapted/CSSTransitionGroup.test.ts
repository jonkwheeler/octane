import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, mount } from '../../../octane/tests/_helpers.ts';
import {
	CustomWrapperHarness,
	GroupHarness,
	GroupShapeHarness,
	NullRenderingGroupHarness,
} from './_fixtures.tsrx';

function items(container: HTMLElement) {
	return Array.from(container.querySelectorAll('[data-group-item]'));
}

function click(container: HTMLElement, selector: string) {
	(container.querySelector(selector) as HTMLButtonElement).click();
}

describe('CSSTransitionGroup', function cssTransitionGroupSuite() {
	beforeEach(function fakeTimers() {
		vi.useFakeTimers();
	});
	afterEach(function realTimers() {
		vi.useRealTimers();
	});

	it('should clean-up silently after the timeout elapses', async function cleanUp() {
		const result = mount(GroupHarness, { trace: [] });
		await act(function replace() {
			click(result.container, '#group-replace');
		});
		expect(items(result.container)).toHaveLength(2);
		await act(function finish() {
			vi.runAllTimers();
		});
		expect(items(result.container)).toHaveLength(1);
		expect(items(result.container)[0].getAttribute('data-group-item')).toBe('two');
		result.unmount();
	});

	it('should keep both sets of DOM nodes around', async function keepNodes() {
		const result = mount(GroupHarness, { trace: [] });
		await act(function replace() {
			click(result.container, '#group-replace');
		});
		expect(
			items(result.container).map(function id(element) {
				return element.getAttribute('data-group-item');
			}),
		).toEqual(['two', 'one']);
		result.unmount();
	});

	it('should switch transitionLeave from false to true', async function enableExit() {
		const result = mount(GroupHarness, { trace: [], initialExit: false, enter: false });
		await act(function replaceWithoutExit() {
			click(result.container, '#group-replace');
			vi.runAllTimers();
		});
		expect(
			items(result.container).map(function id(element) {
				return element.getAttribute('data-group-item');
			}),
		).toEqual(['two']);
		await act(function enableExit() {
			click(result.container, '#group-enable-exit');
		});
		await act(function replaceWithExit() {
			click(result.container, '#group-replace');
		});
		expect(
			items(result.container).map(function id(element) {
				return element.getAttribute('data-group-item');
			}),
		).toEqual(['three', 'two']);
		result.unmount();
	});

	it('should work with a null child', function nullChild() {
		const callbackRef = { current: null as Element | null };
		const result = mount(GroupShapeHarness, { callbackRef });
		expect(result.container.querySelector('main')).not.toBeNull();
		result.unmount();
	});

	it('should work with a child which renders as null', async function nullRenderingChild() {
		const trace: string[] = [];
		const result = mount(NullRenderingGroupHarness, { trace });
		await act(function enterNullChild() {
			click(result.container, '#null-group-show');
			vi.runAllTimers();
		});
		expect(trace).toEqual(['entered']);
		await act(function exitNullChild() {
			click(result.container, '#null-group-hide');
			vi.runAllTimers();
		});
		expect(trace).toEqual(['entered', 'exited']);
		result.unmount();
	});

	it('should transition from one to null', async function oneToNull() {
		const result = mount(GroupHarness, { trace: [] });
		await act(function clear() {
			click(result.container, '#group-clear');
		});
		expect(items(result.container)).toHaveLength(1);
		expect(items(result.container)[0].getAttribute('data-group-item')).toBe('one');
		result.unmount();
	});

	it('should transition from false to one', async function falseToOne() {
		const result = mount(GroupHarness, { trace: [], initialItems: [] });
		expect(items(result.container)).toHaveLength(0);
		await act(function showOne() {
			click(result.container, '#group-one');
		});
		expect(items(result.container)).toHaveLength(1);
		expect(items(result.container)[0].getAttribute('data-group-item')).toBe('one');
		result.unmount();
	});

	it('should clear transition timeouts when unmounted', async function clearTimeouts() {
		const result = mount(GroupHarness, { trace: [] });
		await act(function replace() {
			click(result.container, '#group-replace');
		});
		result.unmount();
		await act(function finish() {
			vi.runAllTimers();
		});
		expect(vi.getTimerCount()).toBe(0);
	});

	it('should handle unmounted elements properly', async function unmountedElements() {
		const result = mount(GroupHarness, { trace: [] });
		await act(function clear() {
			click(result.container, '#group-clear');
		});
		result.unmount();
		await act(function finish() {
			vi.runAllTimers();
		});
		expect(vi.getTimerCount()).toBe(0);
	});

	it('should work with custom component wrapper cloning children', function customWrapper() {
		const result = mount(CustomWrapperHarness);
		expect(result.container.querySelector('#custom-wrapper .wrapper-item')).not.toBeNull();
		result.unmount();
	});
});
