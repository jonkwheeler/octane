import { describe, it, expect } from 'vitest';
import { motionValue } from 'motion';
import { mount, nextPaint } from '../_helpers';
import { MVBox } from '../_fixtures/mv.tsrx';
import { StyleXLater } from '../_fixtures/style-rebind.tsrx';
import { StyleOpacity } from '../_fixtures/style-opacity.tsrx';
import { removeTransformFn } from '../../src/useMotionValue';

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
		expect(div.style.transform).toBe('translateX(40px) scale(2)');
		r.unmount();
	});

	it('patches layout FLIP compound translate instead of stacking translateX', async function patchesLayoutCompoundTranslate() {
		const r = mount(StyleXLater, {});
		await nextPaint();
		const div = r.find('#box');
		div.style.transform = 'translate(-50px, -50px) scale(1.2, 0.8)';

		const x = motionValue(40);
		r.update(StyleXLater, { x });
		await nextPaint();
		expect(div.style.transform).toBe('translate(40px, -50px) scale(1.2, 0.8)');
		expect(div.style.transform).not.toContain('translateX');
		r.unmount();
	});

	it('leaves layout FLIP compound translate alone when unbinding x', function leavesLayoutCompoundOnUnbind() {
		const div = document.createElement('div');
		div.style.transform = 'translate(-50px, -50px) scale(1.2, 0.8)';
		removeTransformFn(div, 'x');
		expect(div.style.transform).toBe('translate(-50px, -50px) scale(1.2, 0.8)');
		div.style.transform = 'translateX(40px) scale(2)';
		removeTransformFn(div, 'x');
		expect(div.style.transform).toBe('scale(2)');
	});

	it('keeps plain static styles when a MotionValue style key becomes static', async function keepsStaticAfterMotionValue() {
		const opacity = motionValue(0.2);
		const r = mount(StyleOpacity, { style: { opacity } });
		await nextPaint();
		const div = r.find('#box');
		expect(div.style.opacity).toBe('0.2');

		r.update(StyleOpacity, { style: { opacity: 0.75 } });
		await nextPaint();
		expect(div.style.opacity).toBe('0.75');
		r.unmount();
	});

	it('patches and removes nested calc() transform values', async function nestedCalcTransformValues() {
		const x = motionValue('calc(100% - 10px)');
		const r = mount(StyleXLater, { x });
		await nextPaint();
		const div = r.find('#box');
		expect(div.style.transform).toContain('translateX(calc(100% - 10px))');

		x.set('calc(50% + 4px)');
		await nextPaint();
		expect(div.style.transform).toBe('translateX(calc(50% + 4px))');

		r.update(StyleXLater, {});
		await nextPaint();
		expect(div.style.transform).toBe('');
		r.unmount();
	});
});
