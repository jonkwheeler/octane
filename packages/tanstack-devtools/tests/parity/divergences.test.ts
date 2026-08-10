import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../../..');
const crosswalk = JSON.parse(
	readFileSync(resolve(root, 'packages/tanstack-devtools/audit/upstream-crosswalk.json'), 'utf8'),
);
const octaneIndex = readFileSync(resolve(root, 'packages/tanstack-devtools/src/index.ts'), 'utf8');

describe('@octanejs/tanstack-devtools divergence contracts', function divergenceSuite() {
	it('records the framework-neutral core version drift', function coreVersion() {
		expect(crosswalk.coreDependency).toEqual({
			upstreamVersion: '0.12.4',
			octaneVersion: '0.12.5',
			disposition: 'version-divergence',
		});
	});

	it('records the Octane-prefixed public adapter type names', function typeNames() {
		expect(octaneIndex).toContain('TanStackDevtoolsOctanePlugin');
		expect(octaneIndex).toContain('TanStackDevtoolsOctaneInit');
		expect(crosswalk.exports).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					name: 'TanStackDevtoolsReactPlugin',
					octaneExport: 'TanStackDevtoolsOctanePlugin',
					disposition: 'renamed-divergence',
				}),
				expect.objectContaining({
					name: 'TanStackDevtoolsReactInit',
					octaneExport: 'TanStackDevtoolsOctaneInit',
					disposition: 'renamed-divergence',
				}),
			]),
		);
	});

	it('records the additional framework-neutral core re-exports', function coreReexports() {
		expect(octaneIndex).toContain('TanStackDevtoolsCore');
		expect(octaneIndex).toContain('PLUGIN_CONTAINER_ID');
		expect(crosswalk.octaneAdditiveExports).toEqual(
			expect.objectContaining({
				disposition: 'additive-divergence',
				divergenceId: 'extra-core-reexports',
			}),
		);
	});
});
