import crosswalk from '../export-crosswalk.json';
import { describe, expect, it } from 'vitest';
import * as localRoot from '../../src/index';
import * as localAsync from '../../src/async';
import * as localCreatable from '../../src/creatable';

const localEntryPoints: Record<string, Record<string, unknown>> = {
	'.': localRoot,
	'./async': localAsync,
	'./creatable': localCreatable,
};

describe('local public export crosswalk', () => {
	it.each(Object.entries(localEntryPoints))(
		'exposes every %s export marked ported-and-tested',
		(path, localEntryPoint) => {
		const entry = crosswalk.entryPoints.find((candidate) => candidate.path === path);
		expect(entry).toBeDefined();
		const expected = Object.entries(entry!.runtimeExports)
			.filter(([, status]) => status === 'ported-and-tested')
			.map(([name]) => name)
			.sort();
		expect(Object.keys(localEntryPoint).sort()).toEqual(expected);
	},
	);
});
