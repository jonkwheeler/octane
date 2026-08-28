import { describe, expect, it } from 'vitest';
import * as hooks from '../src/index.js';

describe('@octanejs/use exports', () => {
	it('preserves the complete published entrypoint', () => {
		expect(Object.keys(hooks).length).toBeGreaterThanOrEqual(100);
		expect(hooks.useAsync).toBeTypeOf('function');
		expect(hooks.useWindowSize).toBeTypeOf('function');
		expect(hooks.createReducer).toBeTypeOf('function');
	});
});
