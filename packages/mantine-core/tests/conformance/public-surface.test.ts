import * as upstream from '@mantine/core';
import * as octane from '@octanejs/mantine-core';
import { describe, expect, it } from 'vitest';

describe('@octanejs/mantine-core public surface', () => {
	it('exports every upstream runtime symbol', () => {
		expect(Object.keys(octane).sort()).toEqual(Object.keys(upstream).sort());
	});
});
