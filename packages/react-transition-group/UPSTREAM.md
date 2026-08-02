# Upstream provenance

This binding is pinned to [`react-transition-group` v4.4.5](https://github.com/reactjs/react-transition-group/tree/v4.4.5), commit `4cb51a9be0ebf508cb8f6506452097f7ebb874fe`.

The upstream project and this adapted package are licensed under BSD-3-Clause. The upstream notice is retained in `LICENSE` and `upstream/LICENSE`.

## Vendored evidence

`upstream/src` and `upstream/test` are byte-exact copies of the source and tests at the pinned tag. `audit/SHA256SUMS` records every retained artifact and `pnpm upstream:check` rejects drift.

The vendored JavaScript is audit evidence only and is not published or executed by the Octane package. The maintained implementation is under `src`; adapted tests are under `tests`.

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
