# Motion upstream ledger

## Pin

- Package: `motion@12.42.2`
- Repository: `https://github.com/motiondivision/motion.git`
- Release tag: `v12.42.2`
- Annotated tag object: `af50633857b1d58e890a47c03114c3d07dcffd32`
- Commit: `40e8756c63b258c9dd07de9501cb788410eefb02`
- npm tarball SHA-256: `d99821507dace914ef6924e95c25beb2d618438fc925517569dd6b083a4df793`
- License: MIT
- React oracle: workspace React 19.2.7

The binding reuses Motion's framework-neutral animation engine and ports a bounded React-facing component and hook surface onto Octane.

## Export crosswalk

| Upstream React surface | Octane surface | Disposition | Evidence |
| --- | --- | --- | --- |
| `motion.<tag>` | `motion.<tag>` | Ported host-component factory | differential render/update case and conformance render/effects suites |
| `AnimatePresence` | `AnimatePresence` | Ported with cleanup-before-detach divergence | `conformance/exit.test.ts` |
| `MotionConfig` | `MotionConfig` | Ported default transition context | `conformance/config.test.ts` |
| `useMotionValue`, `useMotionValueEvent` | same | Ported | motion-value conformance suites |
| `useAnimate`, `useScroll`, `useTransform`, `useSpring` | same | Ported bounded forms | corresponding conformance suites |
| framework-neutral exports from `motion` | root re-exports | Reused unchanged | package dependency and typecheck |
| Remaining React components and hooks | not exported | Explicit gaps | `status.json` notes |

## Test-suite disposition

The canonical tag contains extensive React runtime, SSR, browser/Cypress, and embedded type tests under `packages/framer-motion`. They are present but are not executed unchanged in this recorded-unverified retrofit. One exact React/Octane fixture authenticates host rendering, Motion-only prop filtering, and child updates; the existing Octane conformance suite records animation, gesture, cleanup, layout, and hook behavior without claiming those cases as React equality. The upstream type suite is present but not adapted here.

React materializes styles for an `initial`-only target while the current Octane binding does not. The bounded differential fixture therefore uses `initial={false}` and the package continues to avoid claiming complete React Motion parity.
