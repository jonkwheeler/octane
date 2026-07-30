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

export function ChildProbe(props: { onEnter(args: WaypointCallbackArgs): void }) @{
	<Waypoint onEnter={props.onEnter} children={<div data-testid="child">child</div>} />
}
