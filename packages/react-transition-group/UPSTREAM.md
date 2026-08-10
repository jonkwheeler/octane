# Upstream provenance

This binding is pinned to [`react-transition-group` v4.4.5](https://github.com/reactjs/react-transition-group/tree/v4.4.5), commit `4cb51a9be0ebf508cb8f6506452097f7ebb874fe`.

| Field | Pinned value |
| --- | --- |
| Package | `react-transition-group@4.4.5` |
| Supported upstream range | exactly `4.4.5` |
| Canonical commit | `4cb51a9be0ebf508cb8f6506452097f7ebb874fe` |
| Pristine React oracle | `react@18.3.1` and `react-dom@18.3.1` |
| Type oracle | `@types/react@19.2.17`, `@types/react-dom@19.2.3`, `@types/react-transition-group@4.4.12` |
| Pristine Jest | `jest@30.4.2`, `jest-environment-jsdom@30.4.1`, `babel-jest@30.4.1` |
| Pristine Testing Library | `@testing-library/react@16.3.2` |
| License | BSD-3-Clause |

The upstream project and this adapted package are licensed under BSD-3-Clause. The upstream notice is retained in `LICENSE` and `upstream/LICENSE`.

## Vendored evidence

`upstream/src` and `upstream/test` are byte-exact copies of the source and tests at the pinned tag. `audit/SHA256SUMS` records every retained artifact and `pnpm upstream:check` rejects drift. The required pristine Jest lane (`execution.kind: "jest-full"`) executes all seven vendored suites and all 56 cases unchanged against the React 18.3.1 / Testing Library / Jest stack recorded above.

The vendored JavaScript is audit evidence only and is not published by the Octane package. The maintained implementation is under `src`; one-for-one Octane ports are under `tests/adapted`. `audit/adaptation.json` accounts for every upstream case, including the legacy `findDOMNode` case that cannot apply to Octane.

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
