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
| `Waypoint` | Ported | `tests/waypoint.test.ts`; class lifecycles are expressed with Octane hooks and refs-as-props in `src/Waypoint.tsrx`. |
| `Waypoint.above` | Ported as `Waypoint.above` and `ABOVE` | `tests/waypoint.test.ts` |
| `Waypoint.below` | Ported as `Waypoint.below` and `BELOW` | `tests/waypoint.test.ts` |
| `Waypoint.inside` | Ported as `Waypoint.inside` and `INSIDE` | `tests/waypoint.test.ts` |
| `Waypoint.invisible` | Ported as `Waypoint.invisible` and `INVISIBLE` | `tests/waypoint.test.ts` |
| default export | Ported | `src/index.ts` aliases the Octane `Waypoint`. |
| `CallbackArgs` / `WaypointProps` declarations | Ported | `WaypointCallbackArgs` / `WaypointProps` use structural Octane/DOM types and intentionally do not import React. |

`findScrollableAncestor`, `getBounds`, `getCurrentPosition`, `parseOffset`, and
the named constants are Octane extensions that expose the framework-neutral
geometry used by the component; they are not upstream entry-point exports.

## Upstream test disposition

| Upstream artifact | Disposition |
| --- | --- |
| `test/node/onNextTick.test.js` | Gap: the behavior is exercised indirectly by the component suite, but the original case has not yet been adapted one-for-one. |
| `test/node/resolveScrollableAncestorProp.test.js` | Partially adapted in `tests/waypoint.test.ts` (`resolveScrollableAncestorProp` and `scrollableAncestor="window"`); remaining upstream case inventory still required before parity can be claimed. |
| `test/node/waypoint.test.jsx` | Partially adapted in `tests/waypoint.test.ts`; a case-level inventory and remaining cases are still required before parity can be claimed. |
| `test/browser/waypoint_test.jsx` | Gap: requires browser geometry/scroll execution in the playground or browser CI lane. |
| `test/performance-test.*` | Not a conformance test; retained as upstream benchmark/demo evidence. |

The current suite is classified as Octane-only framework/contract evidence.
It does not yet satisfy the repository's pristine/adapted runtime and type-parity
lanes, inventories, or negative controls. Until those gaps are closed and wired
into `react-parity:check`, this package must remain a draft and its status must
not be read as a complete React-parity claim.
