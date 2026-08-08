import { resolve } from 'node:path';
import { HotkeyManager, SequenceManager } from '@tanstack/hotkeys';
import { drainPassiveEffects } from 'octane';
import { describe, expect, it } from 'vitest';
import { mountDifferential, type DiffMount } from '../../../octane/tests/differential/_rig.js';

const fixture = resolve(__dirname, '../_fixtures/hotkeys-diff.tsrx');
const cache = resolve(__dirname, '.react-cache');

function expectHotkeyProgress(
	mount: DiffMount,
	expected: { single?: number; first?: number; second?: number; sequence?: number },
): void {
	const html = mount.container.innerHTML;
	if (expected.single !== undefined) expect(html).toContain(`single:${expected.single}`);
	if (expected.first !== undefined) expect(html).toContain(`first:${expected.first}`);
	if (expected.second !== undefined) expect(html).toContain(`second:${expected.second}`);
	if (expected.sequence !== undefined) expect(html).toContain(`sequence:${expected.sequence}`);
}

describe('differential: @octanejs/tanstack-hotkeys vs @tanstack/react-hotkeys', () => {
	// @parity-case differential:tanstack-hotkeys-keyboard-lifecycle
	it('matches registration, shortcuts, sequences, enabled updates, and cleanup', async () => {
		const differential = await mountDifferential(fixture, 'HotkeysParity', undefined, cache);
		await differential.step('mount', () => {
			expect(HotkeyManager.getInstance().registrations.state.size).toBeGreaterThan(0);
		});
		await differential.step('single shortcut', async (octane, react) => {
			await react.keydown('#hotkeys-parity', 'k', { code: 'KeyK', ctrlKey: true });
			expectHotkeyProgress(octane, { single: 1 });
		});
		await differential.step('first multi-shortcut definition', async (octane, react) => {
			await react.keydown('#hotkeys-parity', 'l', { code: 'KeyL', ctrlKey: true });
			expectHotkeyProgress(octane, { single: 1, first: 1 });
		});
		await differential.step('second multi-shortcut definition', async (octane, react) => {
			await react.keydown('#hotkeys-parity', 'x', { code: 'KeyX', altKey: true });
			expectHotkeyProgress(octane, { single: 1, first: 1, second: 1 });
		});
		await differential.step('complete sequence', async (octane, react) => {
			await react.keydown('#hotkeys-parity', 'g', { code: 'KeyG' });
			await react.keydown('#hotkeys-parity', 'g', { code: 'KeyG' });
			expectHotkeyProgress(octane, { single: 1, first: 1, second: 1, sequence: 1 });
		});
		await differential.step('disable shortcut', async (octane, react) => {
			await octane.click('#toggle');
			await react.click('#toggle');
		});
		await differential.step('disabled shortcut is inert', async (octane, react) => {
			await react.keydown('#hotkeys-parity', 'k', { code: 'KeyK', ctrlKey: true });
			expectHotkeyProgress(octane, { single: 1, first: 1, second: 1, sequence: 1 });
			expect(octane.container.innerHTML).toContain('enabled:false');
		});
		differential.unmount();
		drainPassiveEffects();
		expect(HotkeyManager.getInstance().registrations.state.size).toBe(0);
		expect(SequenceManager.getInstance().registrations.state.size).toBe(0);
	});
});
