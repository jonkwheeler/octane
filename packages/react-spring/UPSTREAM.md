# React Spring upstream contract

## Pin and source boundary

| Field | Value |
|---|---|
| Packages | `@react-spring/web@10.1.2`, `@react-spring/parallax@10.1.2` |
| Supported upstream range | exactly `10.1.2` |
| Canonical repository | `https://github.com/pmndrs/react-spring.git` |
| Tag and commit | `v10.1.2`, `59b1e5306402d3039120e2da464b66e10b1a1aa1` |
| Runtime oracle | React `19.2.7`, ReactDOM `19.2.7` |
| Framework-neutral dependency | `@react-spring/rafz@10.1.2` |
| License | MIT, © Paul Henschel and React Spring contributors |
| Vendored inventory | 167 files; `SHA256SUMS` digest `10e6fb1c530efe9409d9f3184488bc7d57bcbae3c92ee97553859e4cd0eda993` |

The npm artifacts contain compiled JavaScript, declarations, README files, and
licenses, but not the canonical TypeScript source or test suites. The
byte-exact source, runtime tests, type tests, package manifests, web target,
Parallax demo, and licenses therefore come from the canonical repository at the
tag commit. They live under `upstream/`, retain the repository layout, are
excluded from the published `files`, and are locked file-by-file by
`upstream/SHA256SUMS`.

Run `pnpm --dir packages/react-spring upstream:verify` to detect a modified,
missing, renamed, or unexpected vendored file. The verifier itself has negative
controls in `scripts/react-parity/react-spring-upstream-lib.test.mjs`.

The reusable runtime boundary is deliberately narrow: the port consumes the
exact framework-neutral `@react-spring/rafz` package. Source under upstream
`packages/shared`, `packages/animated`, `packages/core`, `targets/web`, and
`packages/parallax` contains React hooks, contexts, JSX, element types, or
`forwardRef`, so those observable contracts are adapted to Octane. The
`packages/types` tree is the type oracle. Adapted source cites the pinned
release and will be aligned module-by-module beside this tree as the parity
work proceeds.

## Runtime export crosswalk

`tests/conformance/exports.test.ts` enforces this inventory in both directions.
“Ported” means the public value exists in the Octane namespace; behavioral and
type evidence is tracked separately and an export is not a release-ready claim
until its cited lanes pass.

| Upstream export | Disposition | Evidence |
|---|---|---|
| `Any` | Ported type sentinel | export inventory; adapted type lane pending |
| `BailSignal` | Ported interruption signal | export inventory; async-chain parity pending |
| `Controller` | Ported | `tests/conformance/engine.test.ts`; upstream controller adaptation pending |
| `FrameValue` | Ported public base | export inventory; graph parity pending |
| `Globals` | Ported global configuration | export inventory; reduced-motion/global parity pending |
| `Interpolation` | Ported | `tests/conformance/engine.test.ts`; upstream interpolation adaptation pending |
| `Spring` | Ported to Octane render-prop component | `tests/conformance/components.test.ts` |
| `SpringContext` | Ported to Octane context component | `tests/conformance/components.test.ts` |
| `SpringRef` | Ported | `tests/conformance/hooks.test.ts` |
| `SpringValue` | Ported | `tests/conformance/engine.test.ts`; upstream spring-value adaptation pending |
| `Trail` | Ported to keyed Octane renderables | `tests/conformance/components.test.ts` |
| `Transition` | Ported to keyed Octane renderables | `tests/conformance/components.test.ts` |
| `a` | Ported alias | export inventory and animated-host fixture |
| `animated` | Ported to Octane host components | `tests/conformance/prerequisite-seams.test.ts` |
| `config` | Ported | `tests/conformance/engine.test.ts` |
| `createInterpolator` | Ported | export inventory; upstream interpolation adaptation pending |
| `easings` | Ported | export inventory; upstream easing parity pending |
| `inferTo` | Ported | export inventory; upstream helper adaptation pending |
| `interpolate` | Ported alias | `tests/conformance/engine.test.ts` |
| `to` | Ported | `tests/conformance/engine.test.ts` |
| `update` | Reused from exact `rafz` | export inventory; controlled-frame lane pending |
| `useChain` | Ported to Octane hooks | `tests/conformance/hooks.test.ts` |
| `useInView` | Ported to native observer lifecycle | `tests/conformance/browser-hooks.test.ts` |
| `useIsomorphicLayoutEffect` | Ported to Octane layout effect | export inventory; SSR lane pending |
| `useReducedMotion` | Ported to native media-query lifecycle | `tests/conformance/browser-hooks.test.ts` |
| `useResize` | Ported to native observer lifecycle | `tests/conformance/browser-hooks.test.ts` |
| `useScroll` | Ported to native scroll lifecycle | `tests/conformance/browser-hooks.test.ts` |
| `useSpring` | Ported to Octane hooks | `tests/conformance/hooks.test.ts` |
| `useSpringRef` | Ported to Octane hooks | `tests/conformance/hooks.test.ts` |
| `useSpringValue` | Ported to Octane hooks | `tests/conformance/hooks.test.ts` |
| `useSprings` | Ported to Octane hooks | `tests/conformance/hooks.test.ts` |
| `useTrail` | Ported to Octane hooks | `tests/conformance/hooks.test.ts` |
| `useTransition` | Ported with binding-owned keyed retention | `tests/conformance/transitions.test.ts` |
| `Parallax` | Ported at `./parallax` | `tests/conformance/parallax.test.ts` |
| `ParallaxLayer` | Ported at `./parallax` | `tests/conformance/parallax.test.ts` |

`useSpringContext` remains a private helper and is intentionally absent from
the package namespace. Native, Three, Konva, Zdog, and the all-renderer
`react-spring` meta-package are outside this web binding rather than missing web
exports.

## Upstream test-suite disposition

The pinned boundary contains 20 executable unit/type-test files, one shared
setup module, the framework-neutral `rafz` suite, and a nine-file Parallax
browser demo. The vendored files are the authoritative work list.

| Upstream area | Disposition |
|---|---|
| `packages/rafz/src/index.test.ts` | Run against the exact reused dependency; parity lane pending |
| `packages/shared/src/createInterpolator.test.ts` and `stringInterpolation.test.ts` | Adapt case-by-case; pending |
| `packages/shared/src/dom-events/resize/resizeElement.test.ts` | Adapt to Octane observer fixture; pending |
| `packages/shared/src/hooks/useReducedMotion.test.ts` | Adapt to Octane hook fixture; pending |
| `packages/animated/src/createHost.test.ts` | Adapt to Octane host fixture; pending |
| `packages/core/src/AnimationConfig.test.ts`, `Controller.test.ts`, `FrameLoopDemand.test.ts`, `Interpolation.test.ts`, `SpringValue.test.ts`, `helpers.test.ts`, and `interpolate.test.ts` | Adapt deterministic engine cases; pending |
| `packages/core/src/SpringContext.test.tsx` | Adapt to `.tsrx`; pending |
| `packages/core/src/hooks/useSpring.test.tsx`, `useSpringValue.test.ts`, `useSprings.test.tsx`, `useTrail.test.tsx`, and `useTransition.test.tsx` | Adapt to `.tsrx` fixtures; pending |
| `packages/core/src/SpringValue.test-d.ts`, `hooks/useSpring.test-d.ts`, `hooks/useTransition.test-d.ts`, `interpolate.test-d.ts`, and `types/props.test-d.ts` | Run pristine and one-for-one adapted type lanes; pending |
| `targets/web/src/animated.test.tsx` | Adapt and add React/Octane differential host lane; pending |
| `packages/parallax/test/**` | Treat as upstream browser scenario; adapt to the central playground journey; pending |

Pending rows are explicit draft gaps, not skipped or expected-failure tests.
They must become executable evidence or a reviewed, consumer-facing divergence
before the pull request can leave draft status.
