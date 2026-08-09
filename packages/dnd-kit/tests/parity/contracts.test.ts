import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../../..');
const manifest = JSON.parse(
	readFileSync(resolve(root, 'packages/dnd-kit/audit/react-parity.json'), 'utf8'),
);
const status = JSON.parse(readFileSync(resolve(root, 'packages/dnd-kit/status.json'), 'utf8'));

describe('@octanejs/dnd-kit parity audit contracts', () => {
	it('authenticates the pinned upstream source and absent upstream suites', () => {
		expect(manifest.provenance).toMatchObject({
			version: '0.5.0',
			commit: 'cc98bdd52c06e55221e8cf77aaa0c2ec0f55b86f',
			verification: 'recorded-unverified',
		});
		expect(() =>
			execFileSync(process.execPath, ['packages/dnd-kit/scripts/check-upstream-ledger.mjs'], {
				cwd: root,
				stdio: 'pipe',
			}),
		).not.toThrow();
	});

	it('keeps renderer-owned drag adaptations explicit', () => {
		expect(status.divergences).toHaveLength(2);
		expect(status.divergences.join(' ')).toContain('OptimisticSortingPlugin');
		expect(status.divergences.join(' ')).toContain('compiled children');
	});
});
