import { describe, expect, it } from 'vitest';
import { NumberField } from '@octanejs/base-ui/number-field';

describe('@octanejs/base-ui parity audit contracts', () => {
	// OCTANE DIVERGENCE[unported-internal-hover][adapted:base-ui-upstream-crosswalk]
	// @parity-case adapted:base-ui-upstream-crosswalk
	it('accounts for all 43 public subpaths and 348 upstream test artifacts', async () => {
		await import('../../scripts/check-upstream-crosswalk.mjs');
	});

	// OCTANE DIVERGENCE[number-field-interaction-gaps][adapted:base-ui-number-field-gaps]
	// @parity-case adapted:base-ui-number-field-gaps
	it('keeps the unported NumberField interaction surface explicit', () => {
		expect(NumberField).not.toHaveProperty('ScrubArea');
	});
});
