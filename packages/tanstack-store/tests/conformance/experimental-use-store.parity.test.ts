/**
 * Parity evidence for the intentional omission of upstream's experimental
 * `_useStore` export. Kept in its own file so file-granular react-parity
 * ownership does not hide the ordinary module-identity case in parity.test.ts.
 */
import { describe, expect, it } from 'vitest';
import * as binding from '@octanejs/tanstack-store';

describe('export surface', () => {
	// OCTANE DIVERGENCE[tanstack-store-experimental-use-store][adapted:tanstack-store-experimental-use-store]
	// @parity-case adapted:tanstack-store-experimental-use-store
	it('matches the supported @tanstack/react-store runtime exports', async () => {
		const real = await import('@tanstack/react-store');
		const expected = Object.keys(real)
			.filter(function (name) {
				return name !== '_useStore';
			})
			.sort();
		expect(Object.keys(binding).sort()).toEqual(expected);
	});
});
