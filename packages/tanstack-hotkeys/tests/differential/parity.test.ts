import { resolve } from 'node:path';
import { HotkeyManager, SequenceManager } from '@tanstack/hotkeys';
import { describe, expect, it } from 'vitest';
import { mountDifferential } from '../../../octane/tests/differential/_rig.js';

const fixture = resolve(__dirname, '../_fixtures/hotkeys-diff.tsrx');
const cache = resolve(__dirname, '.react-cache');

describe('differential: @octanejs/tanstack-hotkeys vs @tanstack/react-hotkeys', () => {
	// @parity-case differential:tanstack-hotkeys-keyboard-lifecycle
	it('matches registration, shortcuts, sequences, enabled updates, and cleanup', async () => {
		const differential = await mountDifferential(fixture, 'HotkeysParity', undefined, cache);
		await differential.step('mount', () => {});
		await differential.step('single shortcut', async (_octane, react) => {
			await react.keydown('#hotkeys-parity', 'k', { code: 'KeyK', ctrlKey: true });
		});
		await differential.step('first multi-shortcut definition', async (_octane, react) => {
			await react.keydown('#hotkeys-parity', 'l', { code: 'KeyL', ctrlKey: true });
		});
		await differential.step('second multi-shortcut definition', async (_octane, react) => {
			await react.keydown('#hotkeys-parity', 'x', { code: 'KeyX', altKey: true });
		});
		await differential.step('complete sequence', async (_octane, react) => {
			await react.keydown('#hotkeys-parity', 'g', { code: 'KeyG' });
			await react.keydown('#hotkeys-parity', 'g', { code: 'KeyG' });
		});
		await differential.step('disable shortcut', async (octane, react) => {
			await octane.click('#toggle');
			await react.click('#toggle');
		});
		await differential.step('disabled shortcut is inert', async (_octane, react) => {
			await react.keydown('#hotkeys-parity', 'k', { code: 'KeyK', ctrlKey: true });
		});
		differential.unmount();
		expect(HotkeyManager.getInstance().registrations.state.size).toBe(0);
		expect(SequenceManager.getInstance().registrations.state.size).toBe(0);
	});
});
