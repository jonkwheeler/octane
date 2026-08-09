/**
 * Ordinary framework-contract check: the Octane binding omits React Table's
 * ./legacy migration subpath. Kept outside react-parity ownership because it
 * has no paired same-scenario React observation.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

describe('export surface', function () {
	it('does not publish the upstream legacy migration subpath', function () {
		const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8'));
		expect(packageJson.exports).not.toHaveProperty('./legacy');
	});
});
