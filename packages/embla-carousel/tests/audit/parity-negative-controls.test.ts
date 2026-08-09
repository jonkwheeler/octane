import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	summarizeRuntimeInventories,
	verifyManifestFiles,
} from '../../../../scripts/react-parity/harness-lib.mjs';
import manifest from '../../audit/react-parity.json';
import inventory from '../../audit/adapted-runtime.json';
import ledger from '../../audit/type-parity.json';
import { verifyTypeParity } from '../../audit/type-parity.mjs';

const root = resolve(import.meta.dirname, '../../../..');

describe('@octanejs/embla-carousel parity negative controls', () => {
	// @parity-case embla:audit:stale-hash
	it('rejects a stale evidence hash', async () => {
		const changed = structuredClone(manifest);
		changed.lanes[0].files[0].sha256 = '0'.repeat(64);
		await expect(verifyManifestFiles(changed, root)).rejects.toThrow('integrity mismatch');
	});

	// @parity-case embla:audit:removed-runtime-case
	it('rejects a removed runtime inventory case', () => {
		const changed = structuredClone(inventory);
		changed.tests.pop();
		expect(() => {
			const summary = summarizeRuntimeInventories([changed]);
			if (JSON.stringify(summary) !== JSON.stringify(manifest.adaptedRuntimeSummary)) {
				throw new Error('adapted runtime inventory summary drifted');
			}
		}).toThrow('adapted runtime inventory summary drifted');
	});

	// @parity-case embla:audit:deleted-type-assertion
	it('rejects a deleted type assertion and removed expect-error directive', async () => {
		const pristine = await readFile(resolve(root, ledger.pristine), 'utf8');
		const adapted = await readFile(resolve(root, ledger.adapted), 'utf8');
		expect(() =>
			verifyTypeParity(ledger, pristine, adapted.replace('// @type-parity positive:tuple', '')),
		).toThrow(/differs from pristine|assertion group/);
		expect(() =>
			verifyTypeParity(ledger, pristine, adapted.replace(/^\/\/ @ts-expect-error .*$/m, '')),
		).toThrow(/differs from pristine|lost an @ts-expect-error/);
	});

	// @parity-case embla:audit:mutated-assertion-body
	it('rejects a mutated assertion body that keeps the marker', async () => {
		const pristine = await readFile(resolve(root, ledger.pristine), 'utf8');
		const adapted = await readFile(resolve(root, ledger.adapted), 'utf8');
		expect(() =>
			verifyTypeParity(ledger, pristine, adapted.replace('{ loop: true }', '{ loop: false }')),
		).toThrow(/differs from pristine|hashes differ|assertion group hashes drifted/);
	});
});
