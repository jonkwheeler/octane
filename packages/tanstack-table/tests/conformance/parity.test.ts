/**
 * @octanejs/tanstack-table parity — the port must provide every runtime export
 * of real @tanstack/react-table, and its table-core re-export must be the SAME
 * module instance the differential oracle uses (shared sorting/filter fns).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import * as binding from '@octanejs/tanstack-table';

describe('export surface', () => {
	it('provides every runtime export of real @tanstack/react-table', async () => {
		const real = await import('@tanstack/react-table');
		const upstream = Object.keys(real).sort();
		const port = new Set(Object.keys(binding));
		const missing = upstream.filter((name) => !port.has(name));
		expect(missing).toEqual([]);
	});

	// OCTANE DIVERGENCE[tanstack-table-legacy-api][adapted:tanstack-table-legacy-api]
	// @parity-case adapted:tanstack-table-legacy-api
	it('does not publish the upstream legacy migration subpath', () => {
		const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8'));
		expect(packageJson.exports).not.toHaveProperty('./legacy');
	});

	it('re-exports the same @tanstack/table-core module instance', async () => {
		// Identity, not just presence: the differential oracle compares octane and
		// React tables that must share one core (same sort/filter fn registries).
		const core = await import('@tanstack/table-core');
		expect(binding.createColumnHelper).toBe(core.createColumnHelper);
		expect(binding.constructTable).toBe(core.constructTable);
		expect(binding.tableFeatures).toBe(core.tableFeatures);
		expect(binding.createSortedRowModel).toBe(core.createSortedRowModel);
		expect(binding.sortFns).toBe(core.sortFns);
	});
});
