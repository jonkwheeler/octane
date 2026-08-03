import crosswalk from '../export-crosswalk.json';
import { describe, expect, it } from 'vitest';
import * as localRoot from '../../src/index';

describe('local public export crosswalk', () => {
	it('exposes every root export marked ported-and-tested', () => {
		const root = crosswalk.entryPoints.find((entry) => entry.path === '.');
		expect(root).toBeDefined();
		const expected = Object.entries(root!.runtimeExports)
			.filter(([, status]) => status === 'ported-and-tested')
			.map(([name]) => name)
			.sort();
		expect(Object.keys(localRoot).sort()).toEqual(expected);
	});
});
