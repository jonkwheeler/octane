import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { beforeAll, describe, it } from 'vitest';
import { mountDifferential } from '../../../octane/tests/differential/_rig.js';

const FIXTURE = resolve(__dirname, '../_fixtures/tooltip.tsx');
const CACHE = resolve(__dirname, '.react-cache');

beforeAll(() =>
	execFileSync(process.execPath, [resolve(__dirname, 'compile-runner.mjs'), FIXTURE, CACHE]),
);

describe('differential: @octanejs/floating-ui vs @floating-ui/react', () => {
	// OCTANE DIVERGENCE[ref-as-prop][differential:floating-ui-hook-isolation]
	// @parity-case differential:floating-ui-hook-isolation
	it('keeps independent useFloating placements byte-identical', async () => {
		const differential = await mountDifferential(FIXTURE, 'TwoTooltips', undefined, CACHE);
		await differential.step('initial render', () => {});
		differential.unmount();
	});
});
