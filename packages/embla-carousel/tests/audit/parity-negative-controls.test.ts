import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	summarizeRuntimeInventories,
	verifyManifestFiles,
} from '../../../../scripts/react-parity/harness-lib.mjs';
import { verifyEmblaCarouselTestClassifications } from '../../../../scripts/react-parity/embla-carousel-classifications-lib.mjs';
import manifest from '../../audit/react-parity.json';
import pristineInventory from '../../audit/pristine-utils-runtime.json';
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
		const baseline = summarizeRuntimeInventories([pristineInventory]);
		expect(baseline).toEqual({
			inventoryEntries: pristineInventory.tests.length,
			uniqueIdentities: pristineInventory.tests.length,
			duplicateEntriesWithinLanes: 0,
			identitiesSharedAcrossLanes: 0,
		});
		expect(baseline.inventoryEntries).toBeGreaterThan(0);

		const changed = structuredClone(pristineInventory);
		changed.tests.pop();
		expect(function assertDrift() {
			const summary = summarizeRuntimeInventories([changed]);
			if (JSON.stringify(summary) !== JSON.stringify(baseline)) {
				throw new Error('runtime inventory summary drifted');
			}
		}).toThrow('runtime inventory summary drifted');
	});

	// @parity-case embla:audit:deleted-type-assertion
	it('rejects a deleted type assertion and removed expect-error directive', async () => {
		const pristine = await readFile(resolve(root, ledger.pristine), 'utf8');
		const adapted = await readFile(resolve(root, ledger.adapted), 'utf8');
		expect(function deletedAssertion() {
			verifyTypeParity(ledger, pristine, adapted.replace('// @type-parity positive:tuple', ''));
		}).toThrow(/differs from pristine|assertion group/);
		expect(function deletedExpectError() {
			verifyTypeParity(ledger, pristine, adapted.replace(/^\/\/ @ts-expect-error .*$/m, ''));
		}).toThrow(/differs from pristine|lost an @ts-expect-error/);
	});

	// @parity-case embla:audit:mutated-assertion-body
	it('rejects a mutated assertion body that keeps the marker', async () => {
		const pristine = await readFile(resolve(root, ledger.pristine), 'utf8');
		const adapted = await readFile(resolve(root, ledger.adapted), 'utf8');
		expect(function mutatedBody() {
			verifyTypeParity(ledger, pristine, adapted.replace('{ loop: true }', '{ loop: false }'));
		}).toThrow(/differs from pristine|hashes differ|assertion group hashes drifted/);
	});

	it('keeps every port-authored test classified', () => {
		expect(verifyEmblaCarouselTestClassifications(root).tests).toBeGreaterThan(0);
	});
});
