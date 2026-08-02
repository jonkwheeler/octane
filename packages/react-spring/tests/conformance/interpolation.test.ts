import { describe, expect, it } from 'vitest';
import { createInterpolator, createStringInterpolator } from '../../src/shared/index';

describe('upstream interpolation parity', () => {
	it('selects ranges and applies per-side extrapolation', () => {
		const interpolate = createInterpolator({
			range: [0, 0.5, 1],
			output: [0, 10, 30],
			extrapolateLeft: 'identity',
			extrapolateRight: 'clamp',
		});

		expect(interpolate(-1)).toBe(-1);
		expect(interpolate(0.25)).toBe(5);
		expect(interpolate(0.75)).toBe(20);
		expect(interpolate(2)).toBe(30);
	});

	it('interpolates compound strings and preserves exact keyframes', () => {
		const interpolate = createStringInterpolator({
			output: ['translate(0.00px, 20px)', 'translate(10.00px, 40px)'],
		});

		expect(interpolate(0)).toBe('translate(0.00px, 20px)');
		expect(interpolate(0.5)).toBe('translate(5.00px, 30px)');
		expect(interpolate(1)).toBe('translate(10.00px, 40px)');
	});

	it('rejects output strings with mismatched numeric arity', () => {
		expect(() =>
			createStringInterpolator({ output: ['translate(0px, 10px)', 'translate(20px)'] }),
		).toThrow('The arity of each "output" value must be equal');
	});
});
