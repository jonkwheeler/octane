import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { mountDifferential } from '../../../octane/tests/differential/_rig.js';

const fixture = resolve(__dirname, '../_fixtures/pacer-diff.tsrx');
const cache = resolve(__dirname, '.react-cache');
const settleTimer = (): Promise<void> =>
	new Promise((resolveTimer) => setTimeout(resolveTimer, 60));

describe('differential: @octanejs/tanstack-pacer vs @tanstack/react-pacer', () => {
	// @parity-case differential:tanstack-pacer-scheduler-lifecycle
	it('matches debounce, throttle, batch, and teardown behavior', async () => {
		const onPending = vi.fn();
		const differential = await mountDifferential(fixture, 'PacerParity', { onPending }, cache);
		await differential.step('mount', () => {});
		await differential.step('schedule debounce', async (octane, react) => {
			await octane.click('#debounce');
			await react.click('#debounce');
		});
		await differential.step('debounce expires', settleTimer);
		await differential.step('leading throttle', async (octane, react) => {
			await octane.click('#throttle');
			await react.click('#throttle');
		});
		await differential.step('trailing throttle', async (octane, react) => {
			await octane.click('#throttle');
			await react.click('#throttle');
			await settleTimer();
		});
		await differential.step('first batch item', async (octane, react) => {
			await octane.click('#batch-a');
			await react.click('#batch-a');
		});
		await differential.step('batch reaches maximum size', async (octane, react) => {
			await octane.click('#batch-b');
			await react.click('#batch-b');
		});
		await differential.step('schedule work before teardown', async (octane, react) => {
			await octane.click('#pending');
			await react.click('#pending');
		});
		differential.unmount();
		await settleTimer();
		expect(onPending).not.toHaveBeenCalled();
	});
});
