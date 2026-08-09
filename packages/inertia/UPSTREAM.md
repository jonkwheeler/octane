# Upstream source

`upstream/` is an unmodified snapshot of `packages/react` from
`inertiajs/inertia` at commit
`68b13b662d7a6ecdd504026ee18733192b0c7d73` (`@inertiajs/react@3.6.1`).

The snapshot is review evidence for the Octane adapter and is excluded from the
published package by the package manifest's `files` list. Update it only when
intentionally moving the pinned Inertia release.

## Test-suite disposition

The pinned `@inertiajs/react` package tree under `upstream/` contains source
only — no vendored upstream Vitest/Jest suite lives next to that snapshot. The
Inertia monorepo keeps browser/Playwright coverage outside `packages/react`
(for example `tests/form-helper.spec.ts` at the pin). Those artifacts are not
yet vendored or ported case-by-case.

This foundation PR therefore ships **no React-parity lanes**:

- There is no `packages/inertia/audit/react-parity.json`.
- The `inertia` and `inertia-ssr` Vitest projects intentionally omit
  `testExecution`, so they stay on the ordinary shards and are not owned by the
  repository React-parity runner.
- All package-authored tests under `tests/conformance/` and `tests/ssr/` are
  unpaired Octane-only framework-contract / conformance evidence. They must not
  be counted as pinned upstream parity.

| Port-authored artifact | Classification |
|---|---|
| `tests/conformance/exports.test.ts` | Octane-only framework contract — unpaired; asserts adapter namespace vs `@inertiajs/core` identity |
| `tests/conformance/hooks.test.ts` | Octane-only conformance — unpaired; exercise Octane hook wiring against the adapter, not a cited upstream case |
| `tests/conformance/forms-state.test.ts` | Octane-only conformance — unpaired; exercise Octane form/HTTP state contracts, not a cited upstream case |
| `tests/ssr/hooks.server.test.ts` | Octane-only framework contract — unpaired; request-local SSR hook init under Octane's server renderer |

When a later PR ports pinned upstream cases, that work must:

1. cite each case (path + name + source line) or run the same observable scenario
   against the pinned React implementation;
2. register and classify every case in `audit/react-parity.json`;
3. attach `testExecution` ownership (dedicated project or mixed
   `testExecution.include`) so only parity-owned patterns leave the ordinary
   shards.
