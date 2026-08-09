import { describe, expect, it } from 'vitest';
import * as ReactPopper from '@octanejs/react-popper';

describe('@octanejs/react-popper public contract', function publicContractSuite() {
	it('exports the exact upstream runtime surface', function exportsExactSurface() {
		expect(Object.keys(ReactPopper).sort()).toEqual([
			'Manager',
			'Popper',
			'Reference',
			'usePopper',
		]);
	});
});
