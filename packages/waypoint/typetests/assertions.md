# Type parity assertions

`react-waypoint@10.3.0` ships only `index.d.ts` (no upstream type-test suite), so
both sides of this lane are port-authored. The two files assert the same public
surface claims: one against the vendored React declarations compiled with
`tsc`, one against `@octanejs/waypoint` compiled with `tsrx-tsc`.

`react-parity:check` enforces these claims through
`scripts/react-parity/waypoint-types-lib.mjs`: assertion-group inventories in
`audit/pristine-types.json` and `audit/adapted-types.json`, structural/transform
verification, and negative controls for a skipped file, a deleted assertion, and
a removed `@ts-expect-error`.

Permitted differences between the two files, and nothing else:

| # | Transformation | Why |
| --- | --- | --- |
| 1 | import root `react-waypoint` → `@octanejs/waypoint` | the package under test |
| 2 | `Waypoint.WaypointProps` namespace access → named `WaypointProps` export | Octane exports the props type directly |
| 3 | `ReactNode` children → `OctaneNode` children | Octane renderable type |

Every assertion group below appears in both files under the same heading.

1. Position statics `above` / `below` / `inside` / `invisible` are strings.
2. `Waypoint` accepts `onEnter` / `onLeave` / `onPositionChange` callbacks.
3. `scrollableAncestor` accepts the string `"window"`.
4. Unknown props are rejected.
5. A non-function `onEnter` is rejected.
