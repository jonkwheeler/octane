import type { TransitionProps } from '@octanejs/react-transition-group';
import type { InputProps } from '../components.tsrx';
import { asComponentElement } from './component-element';

type InputComponent = typeof import('../components.tsrx').Input;
export type AnimatedInputProps = InputProps & Partial<TransitionProps>;

export function animatedInput(WrappedComponent: InputComponent): InputComponent {
	function AnimatedInput(props: AnimatedInputProps) {
		const {
			in: _in,
			onExited: _onExited,
			appear: _appear,
			enter: _enter,
			exit: _exit,
			...inputProps
		} = props;
		return asComponentElement<InputComponent>(createElement(WrappedComponent, inputProps));
	}
	return AnimatedInput;
}
import { createElement } from 'octane';
