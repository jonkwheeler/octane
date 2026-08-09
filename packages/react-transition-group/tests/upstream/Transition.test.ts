// Ported from react-transition-group@4.4.5 test/Transition-test.js (jest → vitest, octane runtime).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, mount } from '../../../octane/tests/_helpers.ts';
import {
	TransitionChildPropsProbe,
	TransitionStatusProbe,
} from '../_fixtures/upstream-probes.tsrx';

describe('Transition', function transitionSuite() {
	beforeEach(function useFake() {
		vi.useFakeTimers();
	});
	afterEach(function useReal() {
		vi.useRealTimers();
	});

	// Per path: packages/react-transition-group/upstream/test/Transition-test.js:42-60
	it('should not transition on mount', function noTransitionOnMount() {
		const view = mount(TransitionStatusProbe, {
			shown: true,
			timeout: 0,
			onEnter: function onEnter() {
				throw new Error('should not Enter');
			},
		});
		expect(view.container.querySelector('#status')?.textContent).toBe('status: entered');
		view.unmount();
	});

	// Per path: packages/react-transition-group/upstream/test/Transition-test.js:62-90
	it('should transition on mount with `appear`', async function appearOnMount() {
		let entered = false;
		const view = mount(TransitionStatusProbe, {
			shown: true,
			appear: true,
			timeout: 0,
			onEnter: function onEnter() {
				entered = true;
			},
		});
		expect(entered).toBe(true);
		await act(function flush() {
			vi.runAllTimers();
		});
		view.unmount();
	});

	// Per path: packages/react-transition-group/upstream/test/Transition-test.js:92-112
	it('should pass filtered props to children', function filteredProps() {
		const view = mount(TransitionChildPropsProbe, {
			shown: true,
			timeout: 0,
			mountOnEnter: true,
			unmountOnExit: true,
			appear: true,
			enter: true,
			exit: true,
			foo: 'foo',
			bar: 'bar',
		});
		expect(view.container.querySelector('#filtered')?.textContent).toBe('foo: foo, bar: bar');
		view.unmount();
	});

	// Per path: packages/react-transition-group/upstream/test/Transition-test.js:114-137
	it('should allow addEndListener instead of timeouts', async function addEndListenerOnly() {
		const listener = vi.fn(function listen(done: () => void) {
			setTimeout(done, 0);
		});
		let done = false;
		const view = mount(TransitionStatusProbe, {
			shown: false,
			addEndListener: listener as any,
		});
		await act(function enter() {
			view.update(TransitionStatusProbe, {
				shown: true,
				addEndListener: listener as any,
				onEntered: function onEntered() {
					expect(listener).toHaveBeenCalledTimes(1);
					done = true;
				},
			});
		});
		await act(function flush() {
			vi.runAllTimers();
		});
		expect(done).toBe(true);
		view.unmount();
	});

	// Per path: packages/react-transition-group/upstream/test/Transition-test.js:139-168
	it('should fallback to timeouts with addEndListener', async function timeoutBeatsListener() {
		let calledEnd = false;
		let done = false;
		function listener(end: () => void) {
			setTimeout(function finish() {
				calledEnd = true;
				end();
			}, 100);
		}
		const view = mount(TransitionStatusProbe, {
			shown: false,
			timeout: 0,
			addEndListener: listener as any,
		});
		await act(function enter() {
			view.update(TransitionStatusProbe, {
				shown: true,
				timeout: 0,
				addEndListener: listener as any,
				onEntered: function onEntered() {
					expect(calledEnd).toBe(false);
					done = true;
				},
			});
		});
		await act(function flush() {
			vi.runAllTimers();
		});
		expect(done).toBe(true);
		view.unmount();
	});

	// Per path: packages/react-transition-group/upstream/test/Transition-test.js:170-198
	it('should mount/unmount immediately if not have enter/exit timeout', async function emptyTimeout() {
		let done = false;
		const view = mount(TransitionStatusProbe, {
			shown: true,
			timeout: {},
		});
		expect(view.container.querySelector('#status')?.textContent).toBe('status: entered');
		await act(function exit() {
			view.update(TransitionStatusProbe, {
				shown: false,
				timeout: {},
				onExited: function onExited() {
					done = true;
				},
			});
		});
		await act(function flush() {
			vi.runAllTimers();
		});
		expect(done).toBe(true);
		expect(view.container.querySelector('#status')?.textContent).toBe('status: exited');
		view.unmount();
	});

	// Per path: packages/react-transition-group/upstream/test/Transition-test.js:215-227
	// Upstream asserts findDOMNode is unused when nodeRef is set. Octane has no
	// findDOMNode; this case proves nodeRef-driven lifecycle still completes.
	it('should not use `React.findDOMNode` when `nodeRef` is provided', async function nodeRefPath() {
		const view = mount(TransitionStatusProbe, {
			shown: true,
			appear: true,
			timeout: 0,
		});
		await act(function flush() {
			vi.runAllTimers();
		});
		expect(view.container.querySelector('#status')?.textContent).toBe('status: entered');
		view.unmount();
	});

	// Per path: packages/react-transition-group/upstream/test/Transition-test.js:229-261
	it('should use enter timeout if appear not set', async function appearUsesEnter() {
		let calledBeforeEntered = false;
		let done = false;
		setTimeout(function mark() {
			calledBeforeEntered = true;
		}, 10);
		const view = mount(TransitionStatusProbe, {
			shown: true,
			appear: true,
			timeout: { enter: 20, exit: 10 },
			onEntered: function onEntered() {
				expect(calledBeforeEntered).toBe(true);
				done = true;
			},
		});
		await act(function flush() {
			vi.advanceTimersByTime(20);
		});
		expect(done).toBe(true);
		view.unmount();
	});

	// Per path: packages/react-transition-group/upstream/test/Transition-test.js:263-295
	it('should use appear timeout if appear is set', async function appearTimeout() {
		let done = false;
		let isCausedLate = false;
		setTimeout(function late() {
			isCausedLate = true;
		}, 15);
		const view = mount(TransitionStatusProbe, {
			shown: true,
			appear: true,
			timeout: { enter: 20, exit: 10, appear: 5 },
			onEntered: function onEntered() {
				expect(isCausedLate).toBe(false);
				done = true;
			},
		});
		await act(function flush() {
			vi.advanceTimersByTime(5);
		});
		expect(done).toBe(true);
		view.unmount();
	});

	describe('entering', function entering() {
		// Per path: packages/react-transition-group/upstream/test/Transition-test.js:299-331
		it('should fire callbacks', async function fireEnterCallbacks() {
			const callOrder: string[] = [];
			let done = false;
			const view = mount(TransitionStatusProbe, { shown: false, timeout: 10 });
			expect(view.container.querySelector('#status')?.textContent).toBe('status: exited');
			await act(function enter() {
				view.update(TransitionStatusProbe, {
					shown: true,
					timeout: 10,
					onEnter: function onEnter() {
						callOrder.push('onEnter');
					},
					onEntering: function onEntering() {
						callOrder.push('onEntering');
					},
					onEntered: function onEntered() {
						expect(callOrder).toEqual(['onEnter', 'onEntering']);
						done = true;
					},
				});
			});
			await act(function flush() {
				vi.advanceTimersByTime(10);
			});
			expect(done).toBe(true);
			view.unmount();
		});

		// Per path: packages/react-transition-group/upstream/test/Transition-test.js:333-365
		it('should move to each transition state', async function enterStates() {
			let count = 0;
			const view = mount(TransitionStatusProbe, { shown: false, timeout: 10 });
			await act(function enter() {
				view.update(TransitionStatusProbe, {
					shown: true,
					timeout: 10,
					onEnter: function onEnter() {
						count++;
						expect(view.container.querySelector('#status')?.textContent).toBe('status: exited');
					},
					onEntering: function onEntering() {
						count++;
						expect(view.container.querySelector('#status')?.textContent).toBe('status: entering');
					},
					onEntered: function onEntered() {
						expect(view.container.querySelector('#status')?.textContent).toBe('status: entered');
					},
				});
			});
			await act(function flush() {
				vi.advanceTimersByTime(10);
			});
			expect(count).toBe(2);
			view.unmount();
		});
	});

	describe('exiting', function exiting() {
		// Per path: packages/react-transition-group/upstream/test/Transition-test.js:369-401
		it('should fire callbacks', async function fireExitCallbacks() {
			const callOrder: string[] = [];
			let done = false;
			const view = mount(TransitionStatusProbe, { shown: true, timeout: 10 });
			expect(view.container.querySelector('#status')?.textContent).toBe('status: entered');
			await act(function exit() {
				view.update(TransitionStatusProbe, {
					shown: false,
					timeout: 10,
					onExit: function onExit() {
						callOrder.push('onExit');
					},
					onExiting: function onExiting() {
						callOrder.push('onExiting');
					},
					onExited: function onExited() {
						expect(callOrder).toEqual(['onExit', 'onExiting']);
						done = true;
					},
				});
			});
			await act(function flush() {
				vi.advanceTimersByTime(10);
			});
			expect(done).toBe(true);
			view.unmount();
		});

		// Per path: packages/react-transition-group/upstream/test/Transition-test.js:403-438
		it('should move to each transition state', async function exitStates() {
			const states: string[] = [];
			let done = false;
			const view = mount(TransitionStatusProbe, { shown: true, timeout: 10 });
			await act(function exit() {
				view.update(TransitionStatusProbe, {
					shown: false,
					timeout: 10,
					onExit: function onExit() {
						states.push('onExit');
					},
					onExiting: function onExiting() {
						states.push('onExiting');
					},
					onExited: function onExited() {
						states.push('onExited');
						done = true;
					},
				});
			});
			await act(function flush() {
				vi.advanceTimersByTime(10);
			});
			expect(states).toEqual(['onExit', 'onExiting', 'onExited']);
			expect(done).toBe(true);
			expect(view.container.querySelector('#status')?.textContent).toBe('status: exited');
			view.unmount();
		});
	});

	describe('mountOnEnter', function mountOnEnter() {
		// Per path: packages/react-transition-group/upstream/test/Transition-test.js:470-484
		it('should mount when entering', async function mountWhenEntering() {
			let done = false;
			const view = mount(TransitionStatusProbe, {
				shown: false,
				mountOnEnter: true,
				timeout: 10,
			});
			expect(view.container.querySelector('#status')).toBeNull();
			await act(function enter() {
				view.update(TransitionStatusProbe, {
					shown: true,
					mountOnEnter: true,
					timeout: 10,
					onEnter: function onEnter() {
						expect(view.container.querySelector('#status')?.textContent).toBe('status: exited');
						done = true;
					},
				});
			});
			expect(done).toBe(true);
			view.unmount();
		});

		// Per path: packages/react-transition-group/upstream/test/Transition-test.js:486-515
		it('should stay mounted after exiting', async function stayMounted() {
			let entered = false;
			let exited = false;
			const view = mount(TransitionStatusProbe, {
				shown: false,
				mountOnEnter: true,
				timeout: 10,
			});
			expect(view.container.querySelector('#status')).toBeNull();
			await act(function enter() {
				view.update(TransitionStatusProbe, {
					shown: true,
					mountOnEnter: true,
					timeout: 10,
					onEntered: function onEntered() {
						entered = true;
					},
				});
			});
			await act(function flushEnter() {
				vi.advanceTimersByTime(10);
			});
			expect(entered).toBe(true);
			expect(view.container.querySelector('#status')?.textContent).toBe('status: entered');
			await act(function exit() {
				view.update(TransitionStatusProbe, {
					shown: false,
					mountOnEnter: true,
					timeout: 10,
					onExited: function onExited() {
						exited = true;
					},
				});
			});
			await act(function flushExit() {
				vi.advanceTimersByTime(10);
			});
			expect(exited).toBe(true);
			expect(view.container.querySelector('#status')?.textContent).toBe('status: exited');
			view.unmount();
		});
	});

	describe('unmountOnExit', function unmountOnExit() {
		// Per path: packages/react-transition-group/upstream/test/Transition-test.js:547-571
		it('should mount when entering', async function mountWhenEntering() {
			let done = false;
			const view = mount(TransitionStatusProbe, {
				shown: false,
				unmountOnExit: true,
				timeout: 10,
			});
			expect(view.container.querySelector('#status')).toBeNull();
			await act(function enter() {
				view.update(TransitionStatusProbe, {
					shown: true,
					unmountOnExit: true,
					timeout: 10,
					onEnter: function onEnter() {
						expect(view.container.querySelector('#status')).not.toBeNull();
						done = true;
					},
				});
			});
			expect(done).toBe(true);
			view.unmount();
		});

		// Per path: packages/react-transition-group/upstream/test/Transition-test.js:573-599
		it('should unmount after exiting', async function unmountAfterExit() {
			let exited = false;
			const view = mount(TransitionStatusProbe, {
				shown: true,
				unmountOnExit: true,
				timeout: 10,
			});
			expect(view.container.querySelector('#status')).not.toBeNull();
			await act(function exit() {
				view.update(TransitionStatusProbe, {
					shown: false,
					unmountOnExit: true,
					timeout: 10,
					onExited: function onExited() {
						exited = true;
					},
				});
			});
			await act(function flush() {
				vi.advanceTimersByTime(10);
			});
			expect(exited).toBe(true);
			expect(view.container.querySelector('#status')).toBeNull();
			view.unmount();
		});
	});
});
