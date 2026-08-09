# Upstream provenance

This binding is pinned to [`react-transition-group` v4.4.5](https://github.com/reactjs/react-transition-group/tree/v4.4.5), commit `4cb51a9be0ebf508cb8f6506452097f7ebb874fe`. The pristine runtime oracle uses React 18.3.1 (upstream's supported peer range and the last React that still exposes `findDOMNode`); Octane package tests continue to use the workspace React 19 oracle.

The upstream project and this adapted package are licensed under BSD-3-Clause. The upstream notice is retained in `LICENSE` and `upstream/LICENSE`.

## Vendored evidence

`upstream/src` and `upstream/test` are byte-exact copies of the source and tests at the pinned tag. `audit/SHA256SUMS` records every retained artifact and `pnpm upstream:check` rejects drift. `pnpm upstream:verify` also checks `audit/upstream-test-dispositions.json` so every upstream test artifact and case count stays accounted for.

The vendored JavaScript is not published. The maintained implementation is under `src`. Adapted Octane tests are under `tests`. The strongest runtime oracle is the pristine Jest lane: `pnpm test:upstream` runs the pinned suite unchanged against React through the manifest `jest-full` executor and checks every identity against `audit/pristine-runtime.json`.

## Test-suite disposition

The pinned repository contains seven runtime suites plus four support files under `upstream/test`. Every artifact has a disposition in `audit/upstream-test-dispositions.json` (56 executable cases total). Negative controls in `scripts/react-parity/react-transition-group-upstream-lib.test.mjs` reject a missing artifact disposition, a stale `caseCount`, a deleted suite, and a removed case. Adapted one-for-one coverage lives under `tests/upstream/` with `// Per path:` citations.

| Upstream artifact | Disposition |
| --- | --- |
| `test/Transition-test.js` | Pristine oracle + adapted in `tests/upstream/Transition.test.ts` (findDOMNode-without-nodeRef is not applicable) |
| `test/CSSTransition-test.js` | Pristine oracle + adapted in `tests/upstream/CSSTransition.test.ts` |
| `test/CSSTransitionGroup-test.js` | Pristine oracle + adapted in `tests/upstream/TransitionGroup.test.ts` |
| `test/TransitionGroup-test.js` | Pristine oracle + adapted in `tests/upstream/TransitionGroup.test.ts` (StrictMode double-appear is not applicable) |
| `test/SwitchTransition-test.js` | Pristine oracle + adapted in `tests/upstream/SwitchTransition.test.ts` |
| `test/ChildMapping-test.js` | Pristine oracle + adapted in `tests/upstream/ChildMapping.test.ts` |
| `test/SSR-test.js` | Pristine oracle + adapted import/server coverage in `tests/ssr/server.test.ts` |
| `test/setup.js`, `setupAfterEnv.js`, `utils.js`, `.eslintrc.yml` | Support artifacts for the pristine Jest runner |

## Public surface

The published React package exposes six root modules and the Octane package preserves each mapping:

| React import | Octane import |
| --- | --- |
| `react-transition-group` | `@octanejs/react-transition-group` |
| `react-transition-group/Transition` | `@octanejs/react-transition-group/Transition` |
| `react-transition-group/CSSTransition` | `@octanejs/react-transition-group/CSSTransition` |
| `react-transition-group/TransitionGroup` | `@octanejs/react-transition-group/TransitionGroup` |
| `react-transition-group/SwitchTransition` | `@octanejs/react-transition-group/SwitchTransition` |
| `react-transition-group/ReplaceTransition` | `@octanejs/react-transition-group/ReplaceTransition` |
| `react-transition-group/config` | `@octanejs/react-transition-group/config` |

## Adaptation notes

Octane has no `ReactDOM.findDOMNode` equivalent. DOM-aware callbacks and `CSSTransition` therefore require `nodeRef`; callers that omit it still receive lifecycle timing and state transitions, but no inferred DOM node. This follows React Transition Group's recommended `nodeRef` path and avoids a legacy API that React Strict Mode deprecates.

Compiler-generated Octane children blocks are distinguished from genuine render props with `isChildrenBlock`. Introspective collection components should pass descriptor collections through the `children` prop (for example, `children={items.map(...)}`), so keys remain inspectable by `TransitionGroup`.
