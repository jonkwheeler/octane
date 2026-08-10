/**
 * The same authored fixture runs through this adapter and the official
 * @dnd-kit/react@0.5.0 adapter. Each programmatic manager-action lifecycle
 * step must leave the rendered DOM byte-equivalent after the shared rig's
 * normalization. Sensors are empty; transitions come from manager.actions.
 */
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { mountDifferential } from '../../../octane/tests/differential/_rig';
import type { DiffMount } from '../../../octane/tests/differential/_rig';

const fixture = resolve(__dirname, '../_fixtures/differential.tsrx');
const cache = resolve(__dirname, '.react-cache');
const root = resolve(__dirname, '../../../..');
const status = JSON.parse(readFileSync(resolve(root, 'packages/dnd-kit/status.json'), 'utf8'));
const manifest = JSON.parse(
	readFileSync(resolve(root, 'packages/dnd-kit/audit/react-parity.json'), 'utf8'),
);

const rectangle = {
	x: 0,
	y: 0,
	left: 0,
	top: 0,
	right: 80,
	bottom: 80,
	width: 80,
	height: 80,
	toJSON() {
		return this;
	},
} as DOMRect;

function byId(mount: DiffMount, id: string): Element {
	const element = mount.findAll('*').find(function (candidate) {
		return candidate.id === id;
	});
	if (!element) throw new Error(`Missing #${id}`);
	return element;
}

describe('differential: @octanejs/dnd-kit vs @dnd-kit/react', () => {
	// @parity-case differential:dnd-kit-programmatic-manager-lifecycle
	it('matches mount, pickup, movement, overlay, and drop output', async () => {
		const comparison = await mountDifferential(
			fixture,
			'ProgrammaticManagerDragFixture',
			undefined,
			cache,
		);
		await comparison.step('mount and measure', function (octane, react) {
			for (const target of [
				byId(octane, 'drag'),
				byId(octane, 'drop'),
				byId(react, 'drag'),
				byId(react, 'drop'),
			]) {
				vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(rectangle);
			}
		});
		await comparison.step('pickup', async function (octane, react) {
			await octane.click('#pickup');
			await react.click('#pickup');
		});
		await comparison.step('move', async function (octane, react) {
			await octane.click('#move');
			await react.click('#move');
		});
		await comparison.step('drop', async function (octane, react) {
			await octane.click('#drop-control');
			await react.click('#drop-control');
		});
		comparison.unmount();
	});

	// @parity-case differential:dnd-kit-drag-overlay-compiled-children
	it('records DragOverlay compiled-child handling as a structured divergence', () => {
		const divergence = manifest.divergences.find(function (entry: { id: string }) {
			return entry.id === 'dnd-kit-drag-overlay-compiled-children';
		});
		expect(divergence).toBeTruthy();
		expect(status.divergences.join(' ')).toContain('compiled children');
	});

	// @parity-case differential:dnd-kit-sortable-omit-optimistic-sorting
	it('records OptimisticSortingPlugin omission as a structured divergence', () => {
		const divergence = manifest.divergences.find(function (entry: { id: string }) {
			return entry.id === 'dnd-kit-sortable-omit-optimistic-sorting';
		});
		expect(divergence).toBeTruthy();
		expect(status.divergences.join(' ')).toContain('OptimisticSortingPlugin');
	});
});
