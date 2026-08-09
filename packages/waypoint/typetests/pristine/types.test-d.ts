// Pristine side: pinned react-waypoint 10.3.0 declarations (same bytes as
// packages/waypoint/upstream/index.d.ts), compiled with plain tsc. Assertion
// groups are listed in ../assertions.md and must stay one-for-one with
// ../adapted/types.test-d.ts.
import type { ReactNode } from 'react';
import { Waypoint } from 'react-waypoint';

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
const callbackProps: Waypoint.WaypointProps = {
	onEnter: function onEnter() {},
	onLeave: function onLeave() {},
	onPositionChange: function onPositionChange() {},
	children: null as unknown as ReactNode,
};
void callbackProps;
void Waypoint;

// 3. scrollableAncestor accepts the string "window".
const windowAncestor: Waypoint.WaypointProps = {
	scrollableAncestor: 'window',
};
void windowAncestor;

// 4. Unknown props are rejected.
// @ts-expect-error unknown prop
const badProps: Waypoint.WaypointProps = { notAWaypointProp: true };
void badProps;

// 5. A non-function onEnter is rejected.
// @ts-expect-error onEnter must be a function
const badEnter: Waypoint.WaypointProps = { onEnter: 'nope' };
void badEnter;
