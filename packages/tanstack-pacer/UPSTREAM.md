# TanStack React Pacer upstream ledger

`@octanejs/tanstack-pacer` targets `@tanstack/react-pacer@0.22.1` from
`https://github.com/TanStack/pacer.git`.

## Immutable pin

- Tag: `@tanstack/react-pacer@0.22.1`
- Resolved commit: `a894009100aeb373965d4121eb92a1af634af012`
- npm archive SHA-256: `d4055dcec785b5eac078a2c2acde90b80e84e70c0262a174a5065ed92a9be2f0`
- npm lock integrity: `sha512-CenQqK0GluSPIrnsG1yuD7w5uMSQ/4lI9AcGEFxBrRd66r260boWcYRIsS5+eHtXb238FoZYhKmJPGlhRzmHRw==`
- Supported range: exactly `0.22.1`
- License: MIT
- React oracle: workspace-pinned React and React DOM
- Framework-neutral core: exact `@tanstack/pacer@0.21.1`, reused by both adapters

## Source, exports, and suites

The byte-exact tagged adapter directory and root license are vendored under `upstream/`.
`SHA256SUMS` authenticates all 52 files, including 43 source files. The tagged package contains no
runtime test, fixture, or snapshot artifacts. Upstream's `test:types` script compiles package source
but has no dedicated type assertions, so type evidence is `insufficient`.

`audit/upstream-crosswalk.json` accounts for all 16 published entrypoints. The 15 runtime/type
entrypoints have corresponding Octane subpaths; `./package.json` is metadata-only. The binding
reuses the exact framework-neutral core, but the absent adapter suite prevents verified status.

## Executable evidence

One repo-authored differential runs the same compiled fixture against the Octane and React
adapters. It observes debounce expiry, leading/trailing throttle behavior, size-triggered batching,
and cancellation of pending debounced work during teardown. Existing local tests remain Octane
framework contracts and are not counted as React parity.

This representative scheduler lifecycle does not exhaustively prove every sync/async hook family,
provider, render-prop subscription, state/value helper, or option combination. The binding remains
`recorded-unverified`.
