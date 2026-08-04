import { afterEach, describe, expect, it, vi } from 'vitest';
import { delegateEvents, flushSync } from 'octane';
import * as ReactColorful from '@octanejs/react-colorful';
import { flushEffects, mount } from '../../../octane/tests/_helpers';
import {
	AllPickers,
	AlphaHarness,
	HexHarness,
	HslaStringHarness,
	HsvaHarness,
	HsvaStringHarness,
	InputHarness,
	RgbaHarness,
	RgbaStringHarness,
} from './_fixtures/RuntimeHarness.tsrx';

delegateEvents([
	'mousedown',
	'mouseup',
	'mousemove',
	'touchstart',
	'touchmove',
	'touchend',
	'keyup',
]);

const roots: Array<{ unmount: () => void }> = [];

function mountTracked(...args: Parameters<typeof mount<any>>) {
	const root = mount<any>(...args);
	roots.push(root);
	return root;
}

function settle() {
	flushEffects();
	flushSync(() => {});
}

function box(element: Element, width = 100, height = 100) {
	vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
		x: 0,
		y: 0,
		top: 0,
		left: 0,
		right: width,
		bottom: height,
		width,
		height,
		toJSON: () => ({}),
	});
}

afterEach(() => {
	for (const root of roots.splice(0)) root.unmount();
	vi.restoreAllMocks();
});

describe('@octanejs/react-colorful — public components', () => {
	// @parity-case adapted:react-colorful-runtime
	it('exports the exact upstream runtime surface', () => {
		expect(Object.keys(ReactColorful).sort()).toEqual(
			[
				'HexAlphaColorPicker',
				'HexColorInput',
				'HexColorPicker',
				'HslColorPicker',
				'HslStringColorPicker',
				'HslaColorPicker',
				'HslaStringColorPicker',
				'HsvColorPicker',
				'HsvStringColorPicker',
				'HsvaColorPicker',
				'HsvaStringColorPicker',
				'RgbColorPicker',
				'RgbStringColorPicker',
				'RgbaColorPicker',
				'RgbaStringColorPicker',
				'setNonce',
			].sort(),
		);
	});

	it('renders every picker variant with the upstream structure and defaults', () => {
		const root = mountTracked(AllPickers);
		expect(root.findAll('.react-colorful')).toHaveLength(14);
		expect(root.findAll('.react-colorful__saturation')).toHaveLength(14);
		expect(root.findAll('.react-colorful__hue')).toHaveLength(14);
		expect(root.findAll('.react-colorful__alpha')).toHaveLength(7);
		expect(root.findAll('[role="slider"]')).toHaveLength(35);
	});

	it('forwards div attributes, className, and native events', () => {
		const onClick = vi.fn();
		const root = mountTracked(HexHarness, {
			className: 'custom',
			id: 'picker',
			'data-extra': 'yes',
			onClick,
		});
		const picker = root.find('#picker') as HTMLElement;
		expect(picker.className).toBe('react-colorful custom');
		expect(picker.dataset.extra).toBe('yes');
		picker.click();
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it('does not emit on mount, equivalent grayscale hue changes, or controlled rerender', () => {
		const onChange = vi.fn();
		const root = mountTracked(HexHarness, { color: '#c62182', onChange });
		settle();
		expect(onChange).not.toHaveBeenCalled();
		root.update(HexHarness, { color: '#c72282', onChange });
		settle();
		expect(onChange).not.toHaveBeenCalled();
		root.update(HexHarness, { color: '#000', onChange });
		settle();
		const hue = root.find('[aria-label="Hue"]');
		box(hue);
		hue.dispatchEvent(
			new MouseEvent('mousedown', { bubbles: true, cancelable: true, buttons: 1, clientX: 50 }),
		);
		settle();
		expect(onChange).not.toHaveBeenCalled();
	});

	it('emits changed and committed colors for mouse interaction', () => {
		const onChange = vi.fn();
		const onChangeEnd = vi.fn();
		const root = mountTracked(HexHarness, { color: '#ff0000', onChange, onChangeEnd });
		const hue = root.find('[aria-label="Hue"]');
		box(hue);
		hue.dispatchEvent(
			new MouseEvent('mousedown', { bubbles: true, cancelable: true, buttons: 1, clientX: 50 }),
		);
		settle();
		expect(onChange).toHaveBeenLastCalledWith('#00ffff');
		window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
		settle();
		expect(onChangeEnd).toHaveBeenCalledTimes(1);
		expect(onChangeEnd).toHaveBeenLastCalledWith('#00ffff');
	});

	it('supports arrow-key movement, clamping, and commit-on-keyup', () => {
		const onChange = vi.fn();
		const onChangeEnd = vi.fn();
		const root = mountTracked(HexHarness, { color: '#ff0000', onChange, onChangeEnd });
		const hue = root.find('[aria-label="Hue"]');
		const down = new KeyboardEvent('keydown', {
			bubbles: true,
			cancelable: true,
			keyCode: 39,
		});
		hue.dispatchEvent(down);
		settle();
		expect(down.defaultPrevented).toBe(true);
		expect(onChange).toHaveBeenLastCalledWith('#ff4d00');
		hue.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, keyCode: 39 }));
		settle();
		expect(onChangeEnd).toHaveBeenLastCalledWith('#ff4d00');
	});

	it('updates alpha and exposes matching ARIA state', () => {
		const onChange = vi.fn();
		const root = mountTracked(AlphaHarness, { color: '#ff000080', onChange });
		const alpha = root.find('[aria-label="Alpha"]');
		expect(alpha.getAttribute('aria-valuenow')).toBe('50');
		box(alpha);
		alpha.dispatchEvent(
			new MouseEvent('mousedown', { bubbles: true, cancelable: true, buttons: 1, clientX: 25 }),
		);
		settle();
		expect(onChange).toHaveBeenLastCalledWith('#ff000040');
	});

	it('commits release-outside movement but ignores later buttonless moves', () => {
		const onChange = vi.fn();
		const onChangeEnd = vi.fn();
		const root = mountTracked(RgbaHarness, { onChange, onChangeEnd });
		const saturation = root.find('[aria-label="Color"]');
		box(saturation);
		saturation.dispatchEvent(
			new MouseEvent('mousedown', { bubbles: true, buttons: 1, clientX: 20, clientY: 10 }),
		);
		window.dispatchEvent(
			new MouseEvent('mousemove', { bubbles: true, buttons: 1, clientX: 10, clientY: 10 }),
		);
		settle();
		const callsBeforeRelease = onChange.mock.calls.length;
		window.dispatchEvent(
			new MouseEvent('mousemove', { bubbles: true, buttons: 0, clientX: 1, clientY: 50 }),
		);
		settle();
		expect(callsBeforeRelease).toBe(1);
		expect(onChange).toHaveBeenCalledTimes(2);
		expect(onChangeEnd).toHaveBeenCalledTimes(1);
	});

	it('does not commit unchanged input or a drag superseded by controlled color', () => {
		const unchanged = vi.fn();
		const root = mountTracked(HexHarness, { color: '#ffffff', onChangeEnd: unchanged });
		const saturation = root.find('[aria-label="Color"]');
		box(saturation);
		saturation.dispatchEvent(
			new MouseEvent('mousedown', { bubbles: true, buttons: 1, clientX: 0, clientY: 0 }),
		);
		window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
		settle();
		expect(unchanged).not.toHaveBeenCalled();

		const onChange = vi.fn();
		const onChangeEnd = vi.fn();
		root.update(RgbaHarness, { onChange, onChangeEnd });
		const rgbaSaturation = root.find('[aria-label="Color"]');
		box(rgbaSaturation);
		rgbaSaturation.dispatchEvent(
			new MouseEvent('mousedown', { bubbles: true, buttons: 1, clientX: 25, clientY: 25 }),
		);
		settle();
		root.update(RgbaHarness, { color: { r: 0, g: 255, b: 0, a: 1 }, onChange, onChangeEnd });
		settle();
		window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
		settle();
		expect(onChangeEnd).not.toHaveBeenCalled();
	});

	it('covers saturation, alpha, edge clamping, and detailed ARIA keyboard state', () => {
		const onChange = vi.fn();
		const root = mountTracked(RgbaStringHarness, { color: 'rgba(0, 0, 0, 0)', onChange });
		const saturation = root.find('[aria-label="Color"]');
		const alpha = root.find('[aria-label="Alpha"]');
		expect(saturation.getAttribute('aria-valuetext')).toBe('Saturation 0%, Brightness 0%');
		expect(alpha.getAttribute('aria-valuetext')).toBe('0%');
		box(saturation);
		box(alpha);
		saturation.dispatchEvent(
			new MouseEvent('mousedown', {
				bubbles: true,
				buttons: 1,
				clientX: 100,
				clientY: 0,
			}),
		);
		settle();
		alpha.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, buttons: 1, clientX: 100 }));
		settle();
		expect(onChange).toHaveBeenCalledTimes(2);
		expect(saturation.getAttribute('aria-valuetext')).toBe('Saturation 100%, Brightness 100%');
		expect(alpha.getAttribute('aria-valuetext')).toBe('100%');

		const keyboardChange = vi.fn();
		const keyboardRoot = mountTracked(HsvaHarness, {
			color: { h: 180, s: 50, v: 50, a: 0.5 },
			onChange: keyboardChange,
		});
		keyboardRoot
			.find('[aria-label="Color"]')
			.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, keyCode: 39 }));
		settle();
		keyboardRoot
			.find('[aria-label="Alpha"]')
			.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, keyCode: 39 }));
		settle();
		expect(keyboardChange).toHaveBeenCalledTimes(2);

		const edgeChange = vi.fn();
		root.update(HslaStringHarness, { color: 'hsla(200, 0%, 100%, 1)', onChange: edgeChange });
		const edge = root.find('[aria-label="Color"]');
		edge.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, keyCode: 38 }));
		edge.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, keyCode: 37 }));
		settle();
		expect(edgeChange).not.toHaveBeenCalled();

		root.update(HsvaStringHarness, { color: 'hsva(0, 0%, 0%, 1)', onChange: edgeChange });
		root
			.find('[aria-label="Alpha"]')
			.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, keyCode: 39 }));
		settle();
		expect(edgeChange).not.toHaveBeenCalled();
	});
});

describe('@octanejs/react-colorful — HexColorInput', () => {
	it('filters edits and emits valid colors through native input events', () => {
		const onChange = vi.fn();
		const onInput = vi.fn();
		const root = mountTracked(InputHarness, {
			color: '#123456',
			onChange,
			onInput,
			prefixed: true,
		});
		settle();
		const input = root.find('input') as HTMLInputElement;
		expect(input.value).toBe('#123456');
		input.value = '#zzAABBCC';
		input.dispatchEvent(new InputEvent('input', { bubbles: true }));
		settle();
		expect(input.value).toBe('#AABBCC');
		expect(onChange).toHaveBeenLastCalledWith('#AABBCC');
		expect(onInput).toHaveBeenCalledTimes(1);
	});

	it('supports alpha forms and restores invalid values on blur', () => {
		const onBlur = vi.fn();
		const root = mountTracked(InputHarness, {
			color: '#11223344',
			alpha: true,
			prefixed: true,
			onBlur,
		});
		const input = root.find('input') as HTMLInputElement;
		expect(input.value).toBe('#11223344');
		input.value = '#12';
		input.dispatchEvent(new InputEvent('input', { bubbles: true }));
		settle();
		input.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
		settle();
		expect(input.value).toBe('#11223344');
		expect(onBlur).toHaveBeenCalledTimes(1);
	});
});
