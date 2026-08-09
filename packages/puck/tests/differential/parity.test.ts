/**
 * Differential parity: the same `.tsrx` fixture runs through @octanejs/puck
 * (Octane) and published @measured/puck@0.20.2 (React). Setup rewrites the
 * import so the React side is the real upstream binding.
 */
import { describe, it } from 'vitest';
import { resolve } from 'node:path';
import { mountDifferential } from '../../../octane/tests/differential/_rig.js';

const RENDER = resolve(__dirname, '../_fixtures/differential/render-diff.tsrx');
const CACHE = resolve(__dirname, '.react-cache');

describe('differential: @octanejs/puck vs @measured/puck@0.20.2', () => {
	// @parity-case differential:render
	it('Render: configured content is byte-identical', async () => {
		const differential = await mountDifferential(RENDER, 'RenderDiff', undefined, CACHE);
		await differential.step('mount', function noop() {});
		differential.unmount();
	});
});
