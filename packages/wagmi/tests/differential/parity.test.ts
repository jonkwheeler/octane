import { describe, it } from 'vitest';
import { resolve } from 'node:path';
import { mountDifferential } from '../../../octane/tests/differential/_rig.js';

const fixture = resolve(__dirname, '../_fixtures/parity.tsrx');
const cache = resolve(__dirname, '.react-cache');

describe('differential: @octanejs/wagmi vs real wagmi', () => {
	// @parity-case differential:wagmi-connection
	it('connection: disconnected → connected renders byte-identical', async () => {
		const differential = await mountDifferential(fixture, 'WagmiParityApp', undefined, cache);
		await differential.step('disconnected', () => {});
		await differential.step('connect', async (octane, react) => {
			await octane.click('#connect');
			await react.click('#connect');
			await new Promise((resolve) => setTimeout(resolve, 25));
		});
		differential.unmount();
	});
});
