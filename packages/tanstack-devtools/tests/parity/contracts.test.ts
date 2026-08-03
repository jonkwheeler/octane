import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../../..');
const crosswalk = JSON.parse(
	readFileSync(resolve(root, 'packages/tanstack-devtools/audit/upstream-crosswalk.json'), 'utf8'),
);
const source = readFileSync(resolve(root, 'packages/tanstack-devtools/src/index.ts'), 'utf8');

describe('@octanejs/tanstack-devtools parity audit contracts', () => {
	// @parity-case adapted:tanstack-devtools-upstream-ledger
	it('authenticates the complete adapter and absent runtime suite', () => {
		expect(() =>
			execFileSync(
				process.execPath,
				['packages/tanstack-devtools/scripts/check-upstream-ledger.mjs'],
				{ cwd: root, stdio: 'pipe' },
			),
		).not.toThrow();
	});

	// OCTANE DIVERGENCE[core-version][adapted:tanstack-devtools-core-version]
	// @parity-case adapted:tanstack-devtools-core-version
	it('records the framework-neutral core version drift', () => {
		expect(crosswalk.coreDependency).toEqual({
			upstreamVersion: '0.12.4',
			octaneVersion: '0.12.5',
			disposition: 'version-divergence',
		});
	});

	// OCTANE DIVERGENCE[octane-type-names][adapted:tanstack-devtools-type-names]
	// @parity-case adapted:tanstack-devtools-type-names
	it('records the Octane-prefixed public adapter type names', () => {
		expect(source).toContain('TanStackDevtoolsOctanePlugin');
		expect(source).toContain('TanStackDevtoolsOctaneInit');
	});

	// OCTANE DIVERGENCE[extra-core-reexports][adapted:tanstack-devtools-core-reexports]
	// @parity-case adapted:tanstack-devtools-core-reexports
	it('records the additional framework-neutral core re-exports', () => {
		expect(source).toContain('TanStackDevtoolsCore');
		expect(source).toContain('PLUGIN_CONTAINER_ID');
	});
});
