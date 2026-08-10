import { describe, it, expect } from 'vitest';
import { motionValue } from 'motion';
import { mount, nextPaint } from '../_helpers';
import { MVBox } from '../_fixtures/mv.tsrx';
import { StyleXLater } from '../_fixtures/style-rebind.tsrx';

describe('useMotionValue', function useMotionValueSuite() {
	it('binds a MotionValue to style and updates the element without a re-render', async function bindsWithoutRerender() {
		let x: any;
		const r = mount(MVBox, {
			onReady: function onReady(mv: any) {
				x = mv;
			},
		});
		await nextPaint();
		const div = r.find('#box');
		expect(div.style.transform).toContain('translateX(0px)'); // initial
		x.set(120);
		await nextPaint();
		expect(div.style.transform).toContain('translateX(120px)'); // updated via subscription
		r.unmount();
	});

	it('keeps foreign transforms when a style MotionValue is bound later', async function keepsForeignTransformOnRebind() {
		const r = mount(StyleXLater, {});
		await nextPaint();
		const div = r.find('#box');
		// Simulate animate/layout/drag having written a transform before style bind.
		div.style.transform = 'scale(2)';

		const x = motionValue(40);
		r.update(StyleXLater, { x });
		await nextPaint();
		expect(div.style.transform).toContain('scale(2)');
		expect(div.style.transform).toContain('translateX(40px)');
		r.unmount();
	});
});
