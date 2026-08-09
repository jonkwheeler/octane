import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, mount } from '../../../octane/tests/_helpers.ts';
import { CSSHarness, type CSSHarnessProps } from './_fixtures.tsrx';

function createCSS(overrides: Partial<CSSHarnessProps> = {}) {
	const trace: string[] = [];
	const view = mount(CSSHarness, { trace, ...overrides });
	return { trace, view };
}

function node(container: HTMLElement) {
	return container.querySelector('#css-node-adapted') as HTMLElement;
}

function toggle(container: HTMLElement) {
	(container.querySelector('#css-toggle-adapted') as HTMLButtonElement).click();
}

describe('CSSTransition', function cssTransitionSuite() {
	beforeEach(function fakeTimers() {
		vi.useFakeTimers();
	});
	afterEach(function realTimers() {
		vi.useRealTimers();
	});

	it('should flush new props to the DOM before initiating a transition', async function flushProps() {
		const result = createCSS({ extraClass: 'test-class' });
		await act(function enter() {
			toggle(result.view.container);
		});
		expect(node(result.view.container).classList.contains('test-class')).toBe(true);
		expect(node(result.view.container).classList.contains('test-enter')).toBe(true);
		result.view.unmount();
	});

	describe('entering', function enteringSuite() {
		it('should apply classes at each transition state', async function enterClasses() {
			const result = createCSS();
			await act(function enter() {
				toggle(result.view.container);
			});
			expect(node(result.view.container).className).toContain('test-enter');
			expect(node(result.view.container).className).toContain('test-enter-active');
			await act(function finish() {
				vi.runAllTimers();
			});
			expect(node(result.view.container).className).toBe('test-enter-done');
			result.view.unmount();
		});

		it('should apply custom classNames names', async function customEnterClasses() {
			const result = createCSS({
				classNames: {
					enter: 'custom',
					enterActive: 'custom-super-active',
					enterDone: 'custom-super-done',
				},
			});
			await act(function enter() {
				toggle(result.view.container);
			});
			expect(node(result.view.container).className).toBe('custom custom-super-active');
			await act(function finish() {
				vi.runAllTimers();
			});
			expect(node(result.view.container).className).toBe('custom-super-done');
			result.view.unmount();
		});
	});

	describe('appearing', function appearingSuite() {
		it('should apply appear classes at each transition state', async function appearClasses() {
			const result = createCSS({ initial: true, appear: true, classNames: 'appear-test' });
			expect(node(result.view.container).className).toContain('appear-test-appear');
			expect(node(result.view.container).className).toContain('appear-test-appear-active');
			await act(function finish() {
				vi.runAllTimers();
			});
			expect(node(result.view.container).className).toContain('appear-test-appear-done');
			expect(node(result.view.container).className).toContain('appear-test-enter-done');
			expect(result.trace).toEqual(['enter:appear', 'entering:appear', 'entered:appear']);
			result.view.unmount();
		});

		it('should lose the "*-appear-done" class after leaving and entering again', async function removeAppearDone() {
			const result = createCSS({ initial: true, appear: true, classNames: 'appear-test' });
			await act(function finishAppear() {
				vi.runAllTimers();
			});
			await act(function exit() {
				toggle(result.view.container);
				vi.runAllTimers();
			});
			await act(function enter() {
				toggle(result.view.container);
				vi.runAllTimers();
			});
			expect(node(result.view.container).className).toBe('appear-test-enter-done');
			result.view.unmount();
		});

		it('should not add undefined when appearDone is not defined', async function noUndefined() {
			const result = createCSS({
				initial: true,
				appear: true,
				classNames: { appear: 'appear-test' },
			});
			await act(function finish() {
				vi.runAllTimers();
			});
			expect(node(result.view.container).className).toBe('');
			expect(node(result.view.container).className).not.toContain('undefined');
			result.view.unmount();
		});

		it('should not be appearing in normal enter mode', async function normalEnter() {
			const result = createCSS({ appear: true, classNames: 'not-appear-test' });
			await act(function enter() {
				toggle(result.view.container);
			});
			expect(result.trace).toEqual(['enter', 'entering']);
			expect(node(result.view.container).className).toContain('not-appear-test-enter');
			result.view.unmount();
		});

		it('should not enter the transition states when appear=false', function disabledAppear() {
			const result = createCSS({ initial: true, appear: false, classNames: 'appear-fail-test' });
			expect(result.trace).toEqual([]);
			expect(node(result.view.container).className).toBe('');
			result.view.unmount();
		});
	});

	describe('exiting', function exitingSuite() {
		it('should apply classes at each transition state', async function exitClasses() {
			const result = createCSS({ initial: true });
			await act(function exit() {
				toggle(result.view.container);
			});
			expect(node(result.view.container).className).toBe('test-exit test-exit-active');
			await act(function finish() {
				vi.runAllTimers();
			});
			expect(node(result.view.container).className).toBe('test-exit-done');
			result.view.unmount();
		});

		it('should apply custom classNames names', async function customExitClasses() {
			const result = createCSS({
				initial: true,
				classNames: {
					exit: 'custom',
					exitActive: 'custom-super-active',
					exitDone: 'custom-super-done',
				},
			});
			await act(function exit() {
				toggle(result.view.container);
			});
			expect(node(result.view.container).className).toBe('custom custom-super-active');
			await act(function finish() {
				vi.runAllTimers();
			});
			expect(node(result.view.container).className).toBe('custom-super-done');
			result.view.unmount();
		});

		it('should support empty prefix', async function emptyPrefix() {
			const result = createCSS({ initial: true, classNames: '' });
			await act(function exit() {
				toggle(result.view.container);
			});
			expect(node(result.view.container).className).toBe('exit exit-active');
			await act(function finish() {
				vi.runAllTimers();
			});
			expect(node(result.view.container).className).toBe('exit-done');
			result.view.unmount();
		});
	});

	describe('reentering', function reenteringSuite() {
		it('should remove dynamically applied classes', async function dynamicClasses() {
			const result = createCSS({ classNames: 'down' });
			await act(function enter() {
				toggle(result.view.container);
				vi.runAllTimers();
			});
			expect(node(result.view.container).className).toBe('down-enter-done');
			await act(function exit() {
				toggle(result.view.container);
				vi.runAllTimers();
			});
			expect(node(result.view.container).className).toBe('down-exit-done');
			expect(node(result.view.container).className).not.toContain('down-enter');
			result.view.unmount();
		});
	});
});
