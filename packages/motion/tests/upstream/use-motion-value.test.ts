/**
 * Adapted from packages/motion/upstream/src/value/__tests__/use-motion-value.test.tsx.
 */
import { describe, expect, it, vi } from 'vitest';

import { mount, nextPaint } from '../_helpers';
import {
	AcceptsValue,
	FiresCallbacks,
	InitialValue,
	ManualSet,
	motionValue,
} from '../_fixtures/upstream-use-motion-value.tsrx';

describe('useMotionValue', function useMotionValueSuite() {
	it('sets initial value', async function setsInitialValue() {
		const r = mount(InitialValue);
		await nextPaint();
		expect(r.find('#box').style.transform).toContain('translateX(100px)');
		r.unmount();
	});

	it('can be set manually', async function canBeSetManually() {
		const r = mount(ManualSet);
		await nextPaint();
		expect(r.find('#box').style.transform).toContain('translateX(500px)');
		r.unmount();
	});

	it('accepts new motion values', async function acceptsNewMotionValues() {
		const a = motionValue(0);
		const b = motionValue(5);
		const r = mount(AcceptsValue, { x: a });
		await nextPaint();
		// OCTANE DIVERGENCE[motion-zero-transform-serialization][runtime:a6edd8704002ab6c]
		// Octane materializes a zero translate; React's motion/react reports "none".
		expect(r.find('#box').style.transform).toContain('translateX(0px)');

		r.update(AcceptsValue, { x: b });
		await nextPaint();
		expect(r.find('#box').style.transform).toContain('translateX(5px)');
		r.unmount();
	});

	it('fires callbacks', function firesCallbacks() {
		const onChange = vi.fn();
		const r = mount(FiresCallbacks, { onChange });
		expect(onChange).toHaveBeenCalled();
		r.unmount();
	});

	it('is typed', async function isTyped() {
		const r = mount(InitialValue);
		await nextPaint();
		expect(r.find('#box').style.transform).toContain('translateX(100px)');
		r.unmount();
	});
});
