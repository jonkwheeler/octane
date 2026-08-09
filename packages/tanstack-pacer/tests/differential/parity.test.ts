import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountDifferential } from '../../../octane/tests/differential/_rig.js';

const fixture = resolve(__dirname, '../_fixtures/pacer-diff.tsrx');
const cache = resolve(__dirname, '.react-cache');

async function advanceWait(ms: number): Promise<void> {
	await vi.advanceTimersByTimeAsync(ms);
}

beforeEach(function () {
	vi.useFakeTimers();
});

afterEach(function () {
	vi.clearAllTimers();
	vi.useRealTimers();
});

describe('differential: @octanejs/tanstack-pacer vs @tanstack/react-pacer', () => {
	// @parity-case differential:tanstack-pacer-scheduler-lifecycle
	it('matches debounce, throttle, batch, and teardown behavior', async () => {
		const onPending = vi.fn();
		const differential = await mountDifferential(fixture, 'PacerParity', { onPending }, cache);
		await differential.step('mount', function () {});
		await differential.step('schedule debounce', async function (octane, react) {
			await octane.click('#debounce');
			await react.click('#debounce');
			expect(octane.find('#debounced').textContent).toBe('debounced:0');
		});
		await differential.step('debounce expires', async function (octane) {
			await advanceWait(40);
			expect(octane.find('#debounced').textContent).toBe('debounced:1');
		});
		await differential.step('leading throttle', async function (octane, react) {
			await octane.click('#throttle');
			await react.click('#throttle');
			expect(octane.find('#throttled').textContent).toBe('throttled:1');
		});
		await differential.step('trailing throttle', async function (octane, react) {
			await octane.click('#throttle');
			await react.click('#throttle');
			expect(octane.find('#throttled').textContent).toBe('throttled:1');
			await advanceWait(40);
			expect(octane.find('#throttled').textContent).toBe('throttled:2');
		});
		await differential.step('first batch item', async function (octane, react) {
			await octane.click('#batch-a');
			await react.click('#batch-a');
			expect(octane.find('#batch').textContent).toBe('batch:');
		});
		await differential.step('batch reaches maximum size', async function (octane, react) {
			await octane.click('#batch-b');
			await react.click('#batch-b');
			expect(octane.find('#batch').textContent).toBe('batch:a,b');
		});
		await differential.step('schedule work before teardown', async function (octane, react) {
			await octane.click('#pending');
			await react.click('#pending');
		});
		differential.unmount();
		await advanceWait(40);
		expect(onPending).not.toHaveBeenCalled();
	});
});
