import { describe, expect, it } from 'vitest';
import { AnimationConfig, mergeConfig } from '../../src/core/index';

describe('upstream controller configuration parity', () => {
	it('derives tension and friction from frequency and damping', () => {
		const config = mergeConfig(new AnimationConfig(), { frequency: 2, damping: 0.5, mass: 2 });

		expect(config.tension).toBeCloseTo(2 * Math.PI ** 2);
		expect(config.friction).toBeCloseTo(2 * Math.PI);
	});

	it('keeps decay and duration mutually exclusive', () => {
		const config = Object.assign(new AnimationConfig(), { duration: 1000 });
		mergeConfig(config, { decay: true });
		expect(config.duration).toBeUndefined();
	});
});
