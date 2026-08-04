import { useRef } from 'octane';
import type { Octane } from 'octane/jsx-runtime';
import { useColorManipulation } from '../../hooks/useColorManipulation.tsrx';
import { useStyleSheet } from '../../hooks/useStyleSheet.tsrx';
import type { AnyColor, ColorModel, ColorPickerBaseProps } from '../../types';
import { formatClassName } from '../../utils/format';
import { Alpha } from './Alpha.tsrx';
import { Hue } from './Hue.tsrx';
import { Saturation } from './Saturation.tsrx';

interface Props<T extends AnyColor> extends Partial<ColorPickerBaseProps<T>> {
	colorModel: ColorModel<T>;
}

interface RootProps {
	hostProps: Octane.JSX.IntrinsicElements['div'];
	nodeRef: { current: HTMLDivElement | null };
	className: string;
	hsva: import('../../types').HsvaColor;
	onChange: (color: Partial<import('../../types').HsvaColor>) => void;
	onChangeEnd: () => void;
}

function AlphaColorPickerRoot({
	hostProps,
	nodeRef,
	className,
	hsva,
	onChange,
	onChangeEnd,
}: RootProps) {
	return <div {...hostProps} ref={nodeRef} class={className}>
		<Saturation hsva={hsva} onChange={onChange} onChangeEnd={onChangeEnd} />
		<Hue hue={hsva.h} onChange={onChange} onChangeEnd={onChangeEnd} />
		<Alpha
			hsva={hsva}
			onChange={onChange}
			onChangeEnd={onChangeEnd}
			className="react-colorful__last-control"
		/>
	</div>;
}

export const AlphaColorPicker = <T extends AnyColor,>({
	className,
	colorModel,
	color = colorModel.defaultColor,
	onChange,
	onChangeEnd,
	...rest
}: Props<T>) => {
	const nodeRef = useRef<HTMLDivElement | null>(null);
	useStyleSheet(nodeRef);
	const [hsva, updateHsva, commitChange] = useColorManipulation(
		colorModel,
		color,
		onChange,
		onChangeEnd,
	);
	const nodeClassName = formatClassName(['react-colorful', className]);
	return <AlphaColorPickerRoot
		hostProps={rest}
		nodeRef={nodeRef}
		className={nodeClassName}
		hsva={hsva}
		onChange={updateHsva}
		onChangeEnd={commitChange}
	/>;
};
