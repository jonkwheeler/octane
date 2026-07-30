import { Waypoint, type WaypointCallbackArgs } from '@octanejs/waypoint';

export function WaypointProbe(props: {
	onEnter(args: WaypointCallbackArgs): void;
	onLeave(args: WaypointCallbackArgs): void;
	onPositionChange(args: WaypointCallbackArgs): void;
	topOffset?: string | number;
	bottomOffset?: string | number;
	fireOnRapidScroll?: boolean;
}) @{
	<Waypoint {...props} />
}

export function ChildProbe(props: {
	onEnter(args: WaypointCallbackArgs): void;
	childRef?: (node: Element | null) => void;
	label?: string;
}) @{
	<Waypoint
		onEnter={props.onEnter}
		children={<div ref={props.childRef} data-testid="child">{props.label ?? 'child'}</div>}
	/>
}
