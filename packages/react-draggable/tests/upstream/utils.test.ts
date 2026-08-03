import { describe, expect, it } from 'vitest';
import { findInArray, int, isNum, snapToGrid } from '../../src/utils/index.ts';

describe('react-draggable@4.7.1 utility correspondence', () => {
	it('preserves array lookup, numeric coercion, and grid rounding', () => {
		expect(findInArray({ 0: 'a', 1: 'b', length: 2 }, (value) => value === 'b')).toBe('b');
		expect(isNum(Number.NaN)).toBe(false);
		expect(int('12.8px')).toBe(12);
		expect(snapToGrid([10, 25], 16, -14)).toEqual([20, -25]);
	});
});
