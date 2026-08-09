# Type parity assertions

`react-waypoint@10.3.0` ships only `index.d.ts` (no upstream type-test suite), so
both sides of this lane are port-authored. The two files assert the same public
surface claims: one against the vendored React declarations compiled with
`tsc`, one against `@octanejs/waypoint` compiled with `tsrx-tsc`.

Permitted differences between the two files, and nothing else:

| # | Transformation | Why |
| --- | --- | --- |
| 1 | import root `react-waypoint` / relative upstream `index.d.ts` → `@octanejs/waypoint` | the package under test |
| 2 | `React.Component` class shape → function component with attached statics | Octane has no class components |
| 3 | `React.ReactNode` children → `OctaneNode` children | Octane renderable type |

Every assertion group below appears in both files under the same heading.

1. Position statics `above` / `below` / `inside` / `invisible` are strings.
2. `Waypoint` accepts `onEnter` / `onLeave` / `onPositionChange` callbacks.
3. `scrollableAncestor` accepts the string `"window"`.
4. Unknown props are rejected.
5. A non-function `onEnter` is rejected.
