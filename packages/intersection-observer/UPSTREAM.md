# Upstream

- Package: `react-intersection-observer@10.1.0`
- Supported upstream range: `10.1.x`
- Repository: https://github.com/thebuilder/react-intersection-observer
- Tag: `v10.1.0`
- Tag commit: `5f82a7328fb63a2e54729f2205278209c14e30e8`
- License: MIT
- React oracle: `react-intersection-observer@10.1.0` with React `19.2.3`

The npm package publishes compiled output and declarations rather than its
authored source and tests. `upstream/` therefore contains the byte-exact `src/`
tree (including tests), package metadata, and license from the canonical tag.
It is development evidence and is excluded from the published `files`.

## Export crosswalk

| Upstream export | Octane status | Evidence / divergence |
| --- | --- | --- |
| `InView` | Ported | `tests/intersection-observer.test.ts`; class state/lifecycles are expressed with Octane hooks and refs-as-props. |
| `useInView` | Ported | `tests/intersection-observer.test.ts` |
| `useOnInView` | Ported | `tests/intersection-observer.test.ts` |
| `observe` | Ported | `tests/intersection-observer.test.ts`; observer pooling is framework-neutral. |
| `defaultFallbackInView` | Ported | `tests/intersection-observer.test.ts` |
| `./test-utils` runtime exports | Ported | `src/test-utils.ts` and `tests/intersection-observer.test.ts` |
| `IntersectionObserverInitWithOptions` | Ported | `src/types.ts` |
| `ObserverInstanceCallback` | Ported | `src/types.ts` |
| `IntersectionChangeEffect` | Ported | `src/types.ts` |
| `IntersectionOptions` | Ported | `src/types.ts`; React-owned node/ref fields are replaced with structural Octane/DOM types. |
| `IntersectionObserverProps` | Ported as `InViewProps` | `src/types.ts`; the public render-prop and wrapper modes are preserved. |
| `PlainChildrenProps` | Ported as part of `InViewProps` | `src/types.ts` |
| `InViewHookResponse` | Ported | `src/types.ts` |
| `IntersectionEffectOptions` | Ported | `src/types.ts` |

## Upstream test disposition

| Upstream artifact | Disposition |
| --- | --- |
| `src/__tests__/observe.test.ts` | Partially adapted in `tests/intersection-observer.test.ts`; a case-level inventory and remaining cases are still required. |
| `src/__tests__/useInView.test.tsx` | Partially adapted in `tests/intersection-observer.test.ts`; not yet one-for-one. |
| `src/__tests__/useOnInView.test.tsx` | Partially adapted in `tests/intersection-observer.test.ts`; not yet one-for-one. |
| `src/__tests__/InView.test.tsx` | Partially adapted in `tests/intersection-observer.test.ts`; not yet one-for-one. |
| `src/__tests__/setup.test.ts` | Gap: test-utility setup cases are not yet adapted one-for-one. |
| `src/__tests__/browser.test.tsx` | Gap: requires the browser/playground CI lane. |

The current suite is classified as Octane-only framework/contract evidence.
It does not yet satisfy the repository's pristine/adapted runtime and type-parity
lanes, inventories, or negative controls. Until those gaps are closed and wired
into `react-parity:check`, this package must remain a draft and its status must
not be read as a complete React-parity claim.
