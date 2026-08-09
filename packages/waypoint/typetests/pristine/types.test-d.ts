// Pristine side: pinned react-waypoint 10.3.0 declarations (same bytes as
// packages/waypoint/upstream/index.d.ts), compiled with plain tsc. Assertion
// groups are listed in ../assertions.md and must stay one-for-one with
// ../adapted/types.test-d.ts.
import type { ReactNode } from 'react';
import { Waypoint } from 'react-waypoint';

declare function expectType<T>(value: T): void;

/** Position statics above / below / inside / invisible are strings. */
expectType<string>(Waypoint.above);
expectType<string>(Waypoint.below);
expectType<string>(Waypoint.inside);
expectType<string>(Waypoint.invisible);

/** Waypoint accepts onEnter / onLeave / onPositionChange callbacks. */
expectType<Waypoint.WaypointProps>({
	onEnter: function onEnter() {},
	onLeave: function onLeave() {},
	onPositionChange: function onPositionChange() {},
	children: null as unknown as ReactNode,
});

/** scrollableAncestor accepts the string "window". */
expectType<Waypoint.WaypointProps>({
	scrollableAncestor: 'window',
});

/** Unknown props are rejected. */
// @ts-expect-error unknown prop
const badProps: Waypoint.WaypointProps = { notAWaypointProp: true };
void badProps;

/** A non-function onEnter is rejected. */
// @ts-expect-error onEnter must be a function
const badEnter: Waypoint.WaypointProps = { onEnter: 'nope' };
void badEnter;
