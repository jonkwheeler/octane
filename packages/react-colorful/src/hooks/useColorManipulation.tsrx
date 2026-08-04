import { useCallback, useEffect, useRef, useState } from 'octane';
import type { AnyColor, ColorModel, HsvaColor } from '../types';
import { equalColorObjects } from '../utils/compare';
import { useEventCallback } from './useEventCallback.tsrx';

export function useColorManipulation<T extends AnyColor>(
	colorModel: ColorModel<T>,
	color: T,
	onChange?: (color: T) => void,
	onChangeEnd?: (color: T) => void,
): [HsvaColor, (color: Partial<HsvaColor>) => void, () => void] {
	const onChangeCallback = useEventCallback<T>(onChange);
	const onChangeEndCallback = useEventCallback<T>(onChangeEnd);
	const [hsva, updateHsva] = useState<HsvaColor>(() => colorModel.toHsva(color));
	const cache = useRef({ color, hsva });
	const isDirty = useRef(false);

	useEffect(() => {
		if (!colorModel.equal(color, cache.current.color)) {
			const newHsva = colorModel.toHsva(color);
			cache.current = { hsva: newHsva, color };
			updateHsva(newHsva);
			isDirty.current = false;
		}
	}, [color, colorModel]);

	useEffect(() => {
		let newColor: T;
		if (
			!equalColorObjects(hsva, cache.current.hsva) &&
				!colorModel.equal(newColor = colorModel.fromHsva(hsva), cache.current.color)
		) {
			cache.current = { hsva, color: newColor };
			onChangeCallback(newColor);
			isDirty.current = true;
		}
	}, [hsva, colorModel, onChangeCallback]);

	const handleChange = useCallback((params: Partial<HsvaColor>) => {
		updateHsva((current) => Object.assign({}, current, params));
	}, []);

	const commitChange = useCallback(() => {
		if (isDirty.current) {
			isDirty.current = false;
			onChangeEndCallback(cache.current.color);
		}
	}, [onChangeEndCallback]);

	return [hsva, handleChange, commitChange];
}
