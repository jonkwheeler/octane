import Draggable from '../../../src/Draggable.tsrx';
import type { DraggableProps } from '../../../src/types.ts';

export function DraggableHarness(props: DraggableProps & {
	nodeRef: { current: HTMLDivElement | null };
	childMouseDown?: (event: MouseEvent) => void;
}) @{
	<Draggable {...props}>
		<div
			ref={props.nodeRef}
			class="child"
			style={{ color: 'red' }}
			data-kept="yes"
			onMouseDown={props.childMouseDown}
		>
			drag
		</div>
	</Draggable>
}

export function SvgDraggableHarness(props: DraggableProps & {
	nodeRef: { current: SVGSVGElement | null };
}) @{
	<Draggable {...props} nodeRef={props.nodeRef as unknown as { current: HTMLElement | null }}>
		<svg ref={props.nodeRef} data-svg="yes">
			<circle cx="2" cy="2" r="2" />
		</svg>
	</Draggable>
}
