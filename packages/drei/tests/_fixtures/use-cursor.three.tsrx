import { useCursor } from '@octanejs/drei';

export function UseCursorScene(props) @{
	useCursor(props.hovered, props.over, props.out, props.container);
	null;
}
