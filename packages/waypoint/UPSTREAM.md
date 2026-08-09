# Upstream

- Package: `react-waypoint@10.3.0`
- Supported upstream range: `10.3.x`
- Repository: https://github.com/civiccc/react-waypoint
- Tag: `v10.3.0`
- Tag commit: `0905ac5a073131147c96dd0694bd6f1b6ee8bc97`
- License: MIT
- React oracle: `react-waypoint@10.3.0`

The npm package publishes compiled `cjs`/`es` output and declarations, but not
the authored source or tests. `upstream/` therefore contains the byte-exact
`src/`, `test/`, `index.d.ts`, package metadata, and license from the canonical
tag. It is development evidence and is excluded from the published `files`.

## Export crosswalk

| Upstream export | Octane status | Evidence / divergence |
| --- | --- | --- |
| `Waypoint` | Ported | `tests/waypoint.test.ts` and adapted `tests/upstream/waypoint.test.ts`; class lifecycles are expressed with Octane hooks and refs-as-props in `src/Waypoint.tsrx`. |
| `Waypoint.above` | Ported as `Waypoint.above` and `ABOVE` | `tests/waypoint.test.ts` |
| `Waypoint.below` | Ported as `Waypoint.below` and `BELOW` | `tests/waypoint.test.ts` |
| `Waypoint.inside` | Ported as `Waypoint.inside` and `INSIDE` | `tests/waypoint.test.ts` |
| `Waypoint.invisible` | Ported as `Waypoint.invisible` and `INVISIBLE` | `tests/waypoint.test.ts` |
| default export | Ported | `src/index.ts` aliases the Octane `Waypoint`. |
| `CallbackArgs` / `WaypointProps` declarations | Ported | `WaypointCallbackArgs` / `WaypointProps` use structural Octane/DOM types and intentionally do not import React. |

`findScrollableAncestor`, `getBounds`, `getCurrentPosition`, `parseOffset`,
`resolveScrollableAncestorProp`, `onNextTick`, and the named constants are
Octane modules that mirror the framework-neutral geometry/helpers used by the
component; only `resolveScrollableAncestorProp` and the position constants are
public package exports alongside `Waypoint`.

## Upstream test disposition

| Upstream artifact | Disposition |
| --- | --- |
| `test/node/onNextTick.test.js` | Adapted one-for-one in `tests/upstream/onNextTick.test.ts`; pristine Jest lane runs the vendored file. |
| `test/node/resolveScrollableAncestorProp.test.js` | Adapted one-for-one in `tests/upstream/resolveScrollableAncestorProp.test.ts`; pristine Jest lane runs the vendored file. |
| `test/node/waypoint.test.jsx` | Adapted one-for-one in `tests/upstream/waypoint.test.ts` via `octane/server` `renderToStaticMarkup`; pristine Jest lane runs the vendored `react-test-renderer` case. |
| `test/browser/waypoint_test.jsx` | Gap: requires browser geometry/scroll execution in the playground or browser CI lane. |
| `test/performance-test.*` | Not a conformance test; retained as upstream benchmark/demo evidence. |

Executable React-parity evidence for the node suite is registered in
`audit/react-parity.json` (`waypoint-pristine`, `waypoint-adapted`, and
repo-authored type probes). `tests/waypoint.test.ts` remains Octane-only
framework/contract evidence outside `testExecution`. The Karma browser suite is
still required before scroll-geometry parity can be claimed complete.
