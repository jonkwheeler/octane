import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, mount } from '../../../octane/tests/_helpers.ts';
import { GroupHarness, GroupShapeHarness } from './_fixtures.tsrx';

function click(container: HTMLElement, selector: string) {
	(container.querySelector(selector) as HTMLButtonElement).click();
}

describe('TransitionGroup', function transitionGroupSuite() {
	beforeEach(function fakeTimers() {
		vi.useFakeTimers();
	});
	afterEach(function realTimers() {
		vi.useRealTimers();
	});

	it('should allow null components', function nullComponent() {
		const callbackRef = { current: null as Element | null };
		const result = mount(GroupShapeHarness, { callbackRef });
		expect(result.container.textContent).toContain('shape');
		result.unmount();
	});

	it('should allow callback refs', function callbackRefs() {
		const callbackRef = { current: null as Element | null };
		const result = mount(GroupShapeHarness, { callbackRef });
		expect(callbackRef.current).toBeInstanceOf(HTMLSpanElement);
		result.unmount();
		expect(callbackRef.current).toBeNull();
	});

	it('should work with no children', function noChildren() {
		const callbackRef = { current: null as Element | null };
		const result = mount(GroupShapeHarness, { callbackRef });
		expect(result.container.querySelectorAll('div')).toHaveLength(1);
		result.unmount();
	});

	it('should handle transitioning correctly', async function transitionChildren() {
		const trace: string[] = [];
		const result = mount(GroupHarness, { trace });
		await act(function add() {
			click(result.container, '#group-add');
			vi.runAllTimers();
		});
		expect(result.container.querySelectorAll('[data-group-item]')).toHaveLength(2);
		expect(trace).toEqual(['enter:two', 'entering:two', 'entered:two']);
		trace.length = 0;
		await act(function clear() {
			click(result.container, '#group-clear');
			vi.runAllTimers();
		});
		expect(result.container.querySelectorAll('[data-group-item]')).toHaveLength(0);
		expect(trace).toEqual([
			'exit:one',
			'exiting:one',
			'exit:two',
			'exiting:two',
			'exited:one',
			'exited:two',
		]);
		result.unmount();
	});
});
