import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import onNextTick from '../../src/onNextTick.ts';

describe('onNextTick()', function onNextTickSuite() {
	beforeEach(function useFakeTimers() {
		vi.useFakeTimers();
	});

	afterEach(function clearFakeTimers() {
		vi.clearAllTimers();
		vi.useRealTimers();
	});

	// Per packages/waypoint/upstream/test/node/onNextTick.test.js:12
	it('does not call callbacks immediately', function doesNotCallImmediately() {
		const called: number[] = [];

		onNextTick(function push0() {
			called.push(0);
		});

		onNextTick(function push1() {
			called.push(1);
		});

		onNextTick(function push2() {
			called.push(2);
		});

		expect(called).toEqual([]);

		vi.advanceTimersByTime(1);
	});

	// Per packages/waypoint/upstream/test/node/onNextTick.test.js:32
	it('calls callbacks in order', function callsInOrder() {
		const called: number[] = [];

		onNextTick(function push0() {
			called.push(0);
		});

		onNextTick(function push1() {
			called.push(1);
		});

		onNextTick(function push2() {
			called.push(2);
		});

		vi.advanceTimersByTime(1);

		expect(called).toEqual([0, 1, 2]);
	});

	// Per packages/waypoint/upstream/test/node/onNextTick.test.js:52
	it('does not call callbacks that have been unsubscribed', function skipsUnsubscribed() {
		const called: number[] = [];

		onNextTick(function push0() {
			called.push(0);
		});

		const unsub = onNextTick(function push1() {
			called.push(1);
		});

		onNextTick(function push2() {
			called.push(2);
		});

		unsub();

		vi.advanceTimersByTime(1);

		expect(called).toEqual([0, 2]);
	});

	// Per packages/waypoint/upstream/test/node/onNextTick.test.js:74
	it('does nothing if unsubscribe is called multiple times', function multiUnsub() {
		const called: number[] = [];

		onNextTick(function push0() {
			called.push(0);
		});

		const unsub = onNextTick(function push1() {
			called.push(1);
		});

		onNextTick(function push2() {
			called.push(2);
		});

		unsub();
		unsub();
		unsub();

		vi.advanceTimersByTime(1);

		expect(called).toEqual([0, 2]);
	});

	// Per packages/waypoint/upstream/test/node/onNextTick.test.js:98
	it('does nothing when unsubscribing a callback that has already been called', function unsubAfterCall() {
		const called: number[] = [];

		onNextTick(function push0() {
			called.push(0);
		});

		const unsub = onNextTick(function push1() {
			called.push(1);
		});

		onNextTick(function push2() {
			called.push(2);
		});

		vi.advanceTimersByTime(1);

		expect(called).toEqual([0, 1, 2]);

		onNextTick(function push3() {
			called.push(3);
		});

		onNextTick(function push4() {
			called.push(4);
		});

		onNextTick(function push5() {
			called.push(5);
		});

		unsub();

		vi.advanceTimersByTime(1);

		expect(called).toEqual([0, 1, 2, 3, 4, 5]);
	});
});
