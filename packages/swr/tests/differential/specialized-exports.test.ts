import { describe, expect, it } from 'vitest';
import * as immutable from '../../src/immutable/index';
import * as infinite from '../../src/infinite/index';
import * as mutation from '../../src/mutation/index';
import * as subscription from '../../src/subscription/index';

describe('SWR U4 exact specialized runtime oracles', () => {
	it('matches every pinned specialized runtime name', () => {
		expect(Object.keys(infinite).sort()).toEqual(['default', 'infinite', 'unstable_serialize']);
		expect(Object.keys(immutable).sort()).toEqual(['default', 'immutable']);
		expect(Object.keys(mutation).sort()).toEqual(['default']);
		expect(Object.keys(subscription).sort()).toEqual(['default', 'subscription']);
	});
});
