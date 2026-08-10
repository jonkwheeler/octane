/**
 * Differential divergence evidence: Octane ReactMarkView.destroy tears down the
 * portal (effect cleanup runs). Upstream @tiptap/react 3.28.0 leaves the React
 * mark-view tree mounted after ProseMirror detaches the host, so cleanup does
 * not run.
 */
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { mountDifferential } from '../../../octane/tests/differential/_rig.js';
import { flushEffects } from '../_helpers';

const customViewsFixture = resolve(__dirname, '../_fixtures/custom-views-parity.tsrx');
const cache = resolve(__dirname, '.react-cache');

describe('differential: @octanejs/tiptap vs @tiptap/react', function () {
	// @parity-case differential:tiptap-mark-view-portal-cleanup
	it('runs mark-view portal teardown on Octane while React retains the tree', async function () {
		const lifecycle: string[] = [];
		const differential = await mountDifferential(
			customViewsFixture,
			'CustomViewsParity',
			{
				onLifecycle: function onLifecycle() {},
				onMarkLifecycle: function onMarkLifecycle(phase: string) {
					lifecycle.push(phase);
				},
			},
			cache,
		);

		await differential.observe('mount mark portals with lifecycle probes', function () {});
		flushEffects();
		const mounts = lifecycle.filter(function isMount(phase) {
			return phase === 'mark:mount';
		});
		expect(mounts.length).toBeGreaterThanOrEqual(2);

		await differential.observe(
			'remove the mark and compare destroy-driven teardown',
			async function (octane, react) {
				await octane.click('[data-parity-mark-remove]');
				await react.click('[data-parity-mark-remove]');
			},
		);
		flushEffects();

		const cleanups = lifecycle.filter(function isCleanup(phase) {
			return phase === 'mark:cleanup';
		});
		// Octane destroy runs effect cleanup; React retains the mounted tree.
		expect(cleanups).toEqual(['mark:cleanup']);
		expect(differential.octane.container.querySelector('[data-parity-mark-view]')).toBe(null);
		expect(differential.react.container.querySelector('[data-parity-mark-view]')).toBe(null);

		differential.unmount();
	});
});
