# Upstream

## Pin and source boundary

| Field | Value |
|---|---|
| Package | `react-waypoint` |
| Version | `10.3.0` |
| Supported upstream range | `10.3.x` |
| Repository | https://github.com/civiccc/react-waypoint |
| Tag | `v10.3.0` |
| Tag commit | `0905ac5a073131147c96dd0694bd6f1b6ee8bc97` |
| License | MIT |
| React / ReactDOM oracle | `19.2.7` |
| react-test-renderer oracle | `19.2.3` |
| jasmine-core oracle | `5.12.0` |

Upstream peers React 15–18. The pristine node and browser lanes run above that
peer ceiling on the React 19 oracle versions above, in the documented
Chromium/Playwright environment used by `waypoint-pristine-browser` /
`waypoint-adapted-browser`.

The npm package publishes compiled `cjs`/`es` output and declarations, but not
the authored source or tests. `upstream/` therefore contains the byte-exact
`src/`, `test/`, `index.d.ts`, package metadata, and license from the canonical
tag. It is development evidence and is excluded from the published `files`.

## Export crosswalk

| Upstream export | Octane status | Evidence / divergence |
| --- | --- | --- |
| `Waypoint` | Ported | Node and browser pristine/adapted lanes; class lifecycles are expressed with Octane hooks and refs-as-props in `src/Waypoint.tsrx`. |
| `Waypoint.above` | Ported as `Waypoint.above` and `ABOVE` | `tests/waypoint.test.ts` and browser suites |
| `Waypoint.below` | Ported as `Waypoint.below` and `BELOW` | `tests/waypoint.test.ts` and browser suites |
| `Waypoint.inside` | Ported as `Waypoint.inside` and `INSIDE` | `tests/waypoint.test.ts` and browser suites |
| `Waypoint.invisible` | Ported as `Waypoint.invisible` and `INVISIBLE` | Browser suite zero-height parent case; `tests/waypoint.test.ts` |
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
| `test/browser/waypoint_test.jsx` | Pristine Chromium lane runs the vendored Jasmine suite (`waypoint-pristine-browser`); same-scenario Octane adaptation in `tests/browser/adapted` (`waypoint-adapted-browser`). |
| `test/performance-test.*` | Not a conformance test; retained as upstream benchmark/demo evidence. |

Executable React-parity evidence is registered in `audit/react-parity.json`:
node pristine Jest (`jest-full`), node adapted Vitest, pristine/adapted browser
Playwright lanes, and repo-authored type probes with assertion-group
inventories. `tests/waypoint.test.ts` remains Octane-only framework/contract
evidence outside `testExecution`.

Structured adapted-browser divergences (see `audit/react-parity.json`):

- `waypoint-ref-child-contract` — refs-as-props; missing child ref does not throw
  `ensureRefIsUsedByChild` (`runtime:0f5696c86cdcf34e`, `runtime:3098ae49fcaaf40e`).
- `waypoint-onenter-state-update` — no class `forceUpdate`; Wrapper bumps
  `useState` from `onEnter` (`runtime:182f948578b98575`).
