import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, mount } from '../../../octane/tests/_helpers.ts';
import { SwitchNullableHarness } from './_fixtures.tsrx';

function click(container: HTMLElement, selector: string) {
	(container.querySelector(selector) as HTMLButtonElement).click();
}

describe('SwitchTransition', function switchTransitionSuite() {
	beforeEach(function fakeTimers() {
		vi.useFakeTimers();
	});
	afterEach(function realTimers() {
		vi.useRealTimers();
	});

	it('should have default status ENTERED', function defaultStatus() {
		const result = mount(SwitchNullableHarness, { trace: [], initial: 'first' });
		expect(
			result.container.querySelector('[data-nullable-switch]')?.getAttribute('data-state'),
		).toBe('entered');
		result.unmount();
	});

	it('should have default mode: out-in', async function defaultMode() {
		const result = mount(SwitchNullableHarness, { trace: [], initial: 'first' });
		await act(function switchChild() {
			click(result.container, '#switch-second');
		});
		expect(
			result.container.querySelector('[data-nullable-switch="first"]')?.getAttribute('data-state'),
		).toBe('exiting');
		expect(result.container.querySelector('[data-nullable-switch="second"]')).toBeNull();
		result.unmount();
	});

	it('should work without childs', function withoutChildren() {
		const result = mount(SwitchNullableHarness, { trace: [] });
		expect(result.container.querySelector('[data-nullable-switch]')).toBeNull();
		result.unmount();
	});

	it('should switch between components on change state', async function switchComponents() {
		const result = mount(SwitchNullableHarness, { trace: [], initial: 'first' });
		await act(function switchChild() {
			click(result.container, '#switch-second');
		});
		await act(function finishExit() {
			vi.advanceTimersByTime(20);
		});
		await act(function finishEnter() {
			vi.advanceTimersByTime(20);
		});
		expect(result.container.querySelector('[data-nullable-switch="second"]')?.textContent).toBe(
			'second',
		);
		result.unmount();
	});

	it('should switch between null and component', async function switchNull() {
		const trace: string[] = [];
		const result = mount(SwitchNullableHarness, { trace });
		await act(function showFirst() {
			click(result.container, '#switch-first');
			vi.runAllTimers();
		});
		expect(result.container.querySelector('[data-nullable-switch="first"]')).not.toBeNull();
		await act(function showSecond() {
			click(result.container, '#switch-second');
			vi.runAllTimers();
		});
		await act(function finish() {
			vi.runAllTimers();
		});
		expect(result.container.querySelector('[data-nullable-switch="second"]')).not.toBeNull();
		expect(trace).toContain('entered:second');
		result.unmount();
	});
});
