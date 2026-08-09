// Adapted side: @octanejs/waypoint, compiled with tsrx-tsc. Assertion groups
// are listed in ../assertions.md and must stay one-for-one with
// ../pristine/types.test-d.ts.
import type { OctaneNode } from 'octane';
import { Waypoint, type WaypointProps } from '@octanejs/waypoint';

// 1. Position statics above / below / inside / invisible are strings.
const above: string = Waypoint.above;
const below: string = Waypoint.below;
const inside: string = Waypoint.inside;
const invisible: string = Waypoint.invisible;
void above;
void below;
void inside;
void invisible;

// 2. Waypoint accepts onEnter / onLeave / onPositionChange callbacks.
const callbackProps: WaypointProps = {
	onEnter: function onEnter() {},
	onLeave: function onLeave() {},
	onPositionChange: function onPositionChange() {},
	children: null as unknown as OctaneNode,
};
void callbackProps;
void Waypoint;

// 3. scrollableAncestor accepts the string "window".
const windowAncestor: WaypointProps = {
	scrollableAncestor: 'window',
};
void windowAncestor;

// 4. Unknown props are rejected.
// @ts-expect-error unknown prop
const badProps: WaypointProps = { notAWaypointProp: true };
void badProps;

// 5. A non-function onEnter is rejected.
// @ts-expect-error onEnter must be a function
const badEnter: WaypointProps = { onEnter: 'nope' };
void badEnter;
