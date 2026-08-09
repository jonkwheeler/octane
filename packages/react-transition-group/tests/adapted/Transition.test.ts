import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, mount } from '../../../octane/tests/_helpers.ts';
import { TransitionHarness, type TransitionHarnessProps } from './_fixtures.tsrx';

interface Done {
	(): void;
}

function click(container: HTMLElement) {
	(container.querySelector('#transition-toggle') as HTMLButtonElement).click();
}

function status(container: HTMLElement) {
	return container.querySelector('#transition-node')?.getAttribute('data-status') ?? null;
}

function createHarness(overrides: Partial<TransitionHarnessProps> = {}) {
	const trace: string[] = [];
	const view = mount(TransitionHarness, { trace, ...overrides });
	return { trace, view };
}

describe('Transition', function transitionSuite() {
	beforeEach(function fakeTimers() {
		vi.useFakeTimers();
	});
	afterEach(function realTimers() {
		vi.useRealTimers();
	});

	it('should not transition on mount', function noMountTransition() {
		const result = createHarness({ initial: true });
		expect(status(result.view.container)).toBe('entered');
		expect(result.trace).toEqual([]);
		result.view.unmount();
	});

	it('should transition on mount with `appear`', async function appearTransition() {
		const result = createHarness({ initial: true, appear: true });
		expect(result.trace).toEqual(['appear', 'appearing']);
		await act(function finish() {
			vi.runAllTimers();
		});
		expect(result.trace).toEqual(['appear', 'appearing', 'appeared']);
		result.view.unmount();
	});

	it('should pass filtered props to children', function filteredProps() {
		const result = createHarness({ initial: true });
		const node = result.view.container.querySelector('#transition-node')!;
		expect(node.getAttribute('foo')).toBe('foo');
		expect(node.getAttribute('bar')).toBe('bar');
		expect(node.hasAttribute('timeout')).toBe(false);
		result.view.unmount();
	});

	it('should allow addEndListener instead of timeouts', async function endListener() {
		const calls: string[] = [];
		let finishTransition: Done | undefined;
		function listener(done: () => void) {
			calls.push('listener');
			finishTransition = done;
		}
		const result = createHarness({ addEndListener: listener, timeout: undefined });
		await act(function start() {
			click(result.view.container);
		});
		expect(calls).toEqual(['listener']);
		expect(vi.getTimerCount()).toBe(0);
		expect(status(result.view.container)).toBe('entering');
		await act(function finishFromListener() {
			finishTransition?.();
		});
		expect(status(result.view.container)).toBe('entered');
		result.view.unmount();
	});

	it('should fallback to timeouts with addEndListener', async function timeoutFallback() {
		let listenerFinished = false;
		function listener(done: () => void) {
			setTimeout(function finishListener() {
				listenerFinished = true;
				done();
			}, 100);
		}
		const result = createHarness({ addEndListener: listener, timeout: 0 });
		await act(function start() {
			click(result.view.container);
		});
		await act(function finishTimeout() {
			vi.advanceTimersByTime(0);
		});
		expect(listenerFinished).toBe(false);
		expect(status(result.view.container)).toBe('entered');
		result.view.unmount();
	});

	it('should mount/unmount immediately if not have enter/exit timeout', async function missingTimeout() {
		const result = createHarness({ initial: true, timeout: {} });
		await act(function exit() {
			click(result.view.container);
		});
		await act(function finish() {
			vi.runAllTimers();
		});
		expect(status(result.view.container)).toBe('exited');
		result.view.unmount();
	});

	it('should not use `React.findDOMNode` when `nodeRef` is provided', function nodeRefPath() {
		const result = createHarness({ initial: true, appear: true, timeout: 0 });
		expect(result.trace.slice(0, 2)).toEqual(['appear', 'appearing']);
		result.view.unmount();
	});

	describe('appearing timeout', function appearingTimeoutSuite() {
		it('should use enter timeout if appear not set', async function enterTimeoutFallback() {
			const result = createHarness({
				initial: true,
				appear: true,
				timeout: { enter: 20, exit: 10 },
			});
			await act(function beforeEnterTimeout() {
				vi.advanceTimersByTime(10);
			});
			expect(status(result.view.container)).toBe('entering');
			await act(function finish() {
				vi.advanceTimersByTime(10);
			});
			expect(status(result.view.container)).toBe('entered');
			result.view.unmount();
		});

		it('should use appear timeout if appear is set', async function explicitAppearTimeout() {
			const result = createHarness({
				initial: true,
				appear: true,
				timeout: { enter: 20, exit: 10, appear: 5 },
			});
			await act(function finish() {
				vi.advanceTimersByTime(5);
			});
			expect(status(result.view.container)).toBe('entered');
			result.view.unmount();
		});
	});

	describe('entering', function enteringSuite() {
		it('should fire callbacks', async function enteringCallbacks() {
			const result = createHarness();
			await act(function start() {
				click(result.view.container);
			});
			expect(result.trace).toEqual(['enter', 'entering']);
			await act(function finish() {
				vi.runAllTimers();
			});
			expect(result.trace).toEqual(['enter', 'entering', 'entered']);
			result.view.unmount();
		});

		it('should move to each transition state', async function enteringStates() {
			const result = createHarness();
			expect(status(result.view.container)).toBe('exited');
			await act(function start() {
				click(result.view.container);
			});
			expect(status(result.view.container)).toBe('entering');
			await act(function finish() {
				vi.runAllTimers();
			});
			expect(status(result.view.container)).toBe('entered');
			result.view.unmount();
		});
	});

	describe('exiting', function exitingSuite() {
		it('should fire callbacks', async function exitingCallbacks() {
			const result = createHarness({ initial: true });
			await act(function start() {
				click(result.view.container);
			});
			expect(result.trace).toEqual(['exit', 'exiting']);
			await act(function finish() {
				vi.runAllTimers();
			});
			expect(result.trace).toEqual(['exit', 'exiting', 'exited']);
			result.view.unmount();
		});

		it('should move to each transition state', async function exitingStates() {
			const result = createHarness({ initial: true });
			expect(status(result.view.container)).toBe('entered');
			await act(function start() {
				click(result.view.container);
			});
			expect(status(result.view.container)).toBe('exiting');
			await act(function finish() {
				vi.runAllTimers();
			});
			expect(status(result.view.container)).toBe('exited');
			result.view.unmount();
		});
	});

	describe('mountOnEnter', function mountOnEnterSuite() {
		it('should mount when entering', async function mountEntering() {
			const result = createHarness({ mountOnEnter: true });
			expect(status(result.view.container)).toBeNull();
			await act(function start() {
				click(result.view.container);
			});
			expect(status(result.view.container)).toBe('entering');
			result.view.unmount();
		});

		it('should stay mounted after exiting', async function remainMounted() {
			const result = createHarness({ mountOnEnter: true });
			await act(function enter() {
				click(result.view.container);
				vi.runAllTimers();
			});
			await act(function exit() {
				click(result.view.container);
				vi.runAllTimers();
			});
			expect(status(result.view.container)).toBe('exited');
			result.view.unmount();
		});
	});

	describe('unmountOnExit', function unmountOnExitSuite() {
		it('should mount when entering', async function mountBeforeEnter() {
			const result = createHarness({ unmountOnExit: true });
			expect(status(result.view.container)).toBeNull();
			await act(function enter() {
				click(result.view.container);
			});
			expect(status(result.view.container)).toBe('entering');
			result.view.unmount();
		});

		it('should unmount after exiting', async function unmountAfterExit() {
			const result = createHarness({ initial: true, unmountOnExit: true });
			await act(function exit() {
				click(result.view.container);
				vi.runAllTimers();
			});
			expect(status(result.view.container)).toBeNull();
			result.view.unmount();
		});
	});
});
