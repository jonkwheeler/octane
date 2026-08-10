import { describe, it } from 'vitest';
import { resolve } from 'node:path';
import { act as reactAct } from 'react';
import { mountDifferential } from '../../../octane/tests/differential/_rig.js';

const fixture = resolve(__dirname, '../_fixtures/differential.tsrx');
const cache = resolve(__dirname, '.react-cache');

describe('@octanejs/visx React differential', () => {
	// @parity-case differential:visx-primitives
	it('matches scale, grid, gradient, axis, glyph, bar, and line SVG', async () => {
		const differential = await mountDifferential(
			fixture,
			'PrimitiveDifferential',
			undefined,
			cache,
		);
		await differential.step('mount', () => {});
		differential.unmount();
	});

	// @parity-case differential:visx-layout
	it('matches render-prop pie layout and path generation', async () => {
		const differential = await mountDifferential(fixture, 'LayoutDifferential', undefined, cache);
		await differential.step('mount', () => {});
		differential.unmount();
	});

	// OCTANE DIVERGENCE[visx-native-dom-events][differential:visx-interaction]: Octane delivers a native click; React uses its synthetic layer.
	// @parity-case differential:visx-interaction
	it('matches state updates while Octane delivers a native click event', async function () {
		const differential = await mountDifferential(
			fixture,
			'InteractiveDifferential',
			undefined,
			cache,
		);
		await differential.step('click', async function ({ container: octane }, { container: react }) {
			(octane.querySelector('[data-testid="select-bar"]') as SVGRectElement).dispatchEvent(
				new MouseEvent('click', { bubbles: true }),
			);
			await reactAct(async function () {
				(react.querySelector('[data-testid="select-bar"]') as SVGRectElement).dispatchEvent(
					new MouseEvent('click', { bubbles: true }),
				);
			});
		});
		differential.unmount();
	});

	// @parity-case differential:visx-functional-controllers
	it('matches interactive selection without class-instance controller refs', async function () {
		const differential = await mountDifferential(
			fixture,
			'InteractiveDifferential',
			undefined,
			cache,
		);
		await differential.step('mount', function () {});
		differential.unmount();
	});

	// @parity-case differential:visx-native-gestures
	it('matches primitive SVG under native gesture and spring adapters', async function () {
		const differential = await mountDifferential(
			fixture,
			'PrimitiveDifferential',
			undefined,
			cache,
		);
		await differential.step('mount', function () {});
		differential.unmount();
	});
});
