/** @jsxImportSource octane */
import { useRef } from 'octane';

import { useDrag, useDrop } from '../../src/components';

export function NativeDraggable(props: { onDragStart: () => void }) {
	const { dragProps, isDragging } = useDrag({
		getItems: () => [{ 'text/plain': 'item' }],
		onDragStart: props.onDragStart,
	});

	return (
		<button {...dragProps} data-dragging={String(isDragging)}>
			drag me
		</button>
	);
}

export function ActivatingDropTarget(props: { onDropActivate: () => void }) {
	const ref = useRef<HTMLDivElement | null>(null);
	const { dropProps, isDropTarget } = useDrop({ ref, onDropActivate: props.onDropActivate });

	return (
		<div ref={ref} {...dropProps} data-drop-target={String(isDropTarget)}>
			drop here
		</div>
	);
}
