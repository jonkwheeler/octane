// Adapted side: @octanejs/waypoint, compiled with tsrx-tsc. Assertion groups
// are listed in ../assertions.md and must stay one-for-one with
// ../pristine/types.test-d.ts.
import type { OctaneNode } from 'octane';
import { Waypoint, type WaypointProps } from '@octanejs/waypoint';

declare function expectType<T>(value: T): void;

/** Position statics above / below / inside / invisible are strings. */
expectType<string>(Waypoint.above);
expectType<string>(Waypoint.below);
expectType<string>(Waypoint.inside);
expectType<string>(Waypoint.invisible);

/** Waypoint accepts onEnter / onLeave / onPositionChange callbacks. */
expectType<WaypointProps>({
	onEnter: function onEnter() {},
	onLeave: function onLeave() {},
	onPositionChange: function onPositionChange() {},
	children: null as unknown as OctaneNode,
});

/** scrollableAncestor accepts the string "window". */
expectType<WaypointProps>({
	scrollableAncestor: 'window',
});

/** Unknown props are rejected. */
// @ts-expect-error unknown prop
const badProps: WaypointProps = { notAWaypointProp: true };
void badProps;

/** A non-function onEnter is rejected. */
// @ts-expect-error onEnter must be a function
const badEnter: WaypointProps = { onEnter: 'nope' };
void badEnter;
