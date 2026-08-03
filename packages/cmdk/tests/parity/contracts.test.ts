import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../../..');
const manifest = JSON.parse(
	readFileSync(resolve(root, 'packages/cmdk/audit/react-parity.json'), 'utf8'),
);

describe('@octanejs/cmdk parity audit contracts', () => {
	// @parity-case adapted:cmdk-upstream-ledger
	it('authenticates the pinned upstream source and complete Playwright inventory', () => {
		expect(manifest.provenance).toMatchObject({
			version: '1.1.1',
			commit: 'fb4ea04e9ec211777fbb39c6104e3c5f2ee107d2',
			verification: 'recorded-unverified',
		});
		expect(() =>
			execFileSync(process.execPath, ['packages/cmdk/scripts/check-upstream-ledger.mjs'], {
				cwd: root,
				stdio: 'pipe',
			}),
		).not.toThrow();
	});

	// @parity-case adapted:cmdk-unadapted-upstream-suite
	it('keeps the canonical upstream suite outside the bounded parity claim', () => {
		expect(manifest.upstreamSuites.runtime).toBe('present');
		expect(
			manifest.lanes.some(
				(lane: { evidenceOrigin?: string }) => lane.evidenceOrigin === 'upstream-suite',
			),
		).toBe(false);
	});
});
