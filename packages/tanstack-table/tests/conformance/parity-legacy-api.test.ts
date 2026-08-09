/**
 * Adapted divergence: the Octane binding omits React Table's ./legacy
 * migration subpath. Kept in its own file so the mixed tanstack-table project
 * can own this parity evidence without excluding the rest of export-surface
 * conformance from ordinary shards.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

describe('export surface', function () {
	// OCTANE DIVERGENCE[tanstack-table-legacy-api][adapted:tanstack-table-legacy-api]
	// @parity-case adapted:tanstack-table-legacy-api
	it('does not publish the upstream legacy migration subpath', function () {
		const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8'));
		expect(packageJson.exports).not.toHaveProperty('./legacy');
	});
});
