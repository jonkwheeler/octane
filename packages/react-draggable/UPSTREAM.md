# Upstream react-draggable audit

This binding targets exactly `react-draggable@4.7.1`. It does not claim a
floating compatibility range.

- repository: `https://github.com/react-grid-layout/react-draggable.git`
- annotated tag: `v4.7.1`
- tag object: `cec7498ff84e91215987636d3edbb6ca132ee9e5`
- tag commit: `bcbaa8eb285aea49865ca8870c0b7b441c2fe6a4`
- commit tree: `7b17a5d02449287945f87dee0cecdadcfb56cdc5`
- npm integrity: `sha512-wa3tzfFnYt3yaZLuyU58fl1TNunfWfBekDgWhZA1+gb2jnp42wZ0ymuopR6M5kqDYmm4hKmzGlcKWjZf3Zb6RQ==`
- npm tarball SHA-1: `e502c3cfe0cc97d691e12aaa377a975fce097d71`
- license: MIT

The npm tarball is the consumer authority for runtime bytes, declarations,
exports, and package conditions. The annotated Git tag is the source, test,
fixture, and license authority. The tag object resolves directly to the commit
above. [`audit/artifact-authorities.json`](./audit/artifact-authorities.json)
records every npm/tag boundary discrepancy and its disposition.

## Vendored boundary

`upstream/npm/` is the complete unpacked npm artifact: all 26 published files,
including the exact CJS/ESM runtime, declaration files, source maps, web build,
metadata, README, changelog, and license. `upstream/tag/` contains the relevant
byte-exact repository boundary: all ten `lib/` source modules; all `test/`
files and fixtures; the `typings/` consumer program; package metadata; compiler,
build, and Vitest configuration; and the license.

Vendored evidence is development-only. The binding's `files` allowlist excludes
`upstream/`, `audit/`, and `tests/audit/`.

## Public surface

The pinned root runtime exports default `Draggable` and named
`DraggableCore`. Its eight public type exports are `ControlPosition`,
`DraggableBounds`, `DraggableCoreProps`, `DraggableData`, `DraggableEvent`,
`DraggableEventHandler`, `DraggableProps`, and
`PositionOffsetControlPosition`. The only package subpaths are `.` and
`./package.json`.

The generated declaration also contains private bundle types and an internal
`DraggableDefaultProps` export from the non-public `Draggable` chunk. Those are
not root exports and therefore are not consumer surface. The root declaration,
not the source module's convenience exports, is authoritative.

## Exhaustive work list

[`audit/upstream-inventory.json`](./audit/upstream-inventory.json) is the
machine-readable crosswalk. It hashes every vendored artifact and gives exactly
one disposition to every source module, public runtime export, public type
export, unit/type case, browser case, fixture, and type assertion. U1 records
future adaptations as `pending-adaptation`; later units must replace those
entries with executable evidence rather than deleting them.

The pinned repository contains exactly 204 non-browser unit/type cases across
11 test files and 23 browser cases. The type-compatibility fixture contains 40
explicit `expectType` assertions. Test identities include file, source line,
and title so same-titled cases in different `describe` blocks remain distinct.
The sole port-authored U1 test is classified as an Octane-only framework
contract because it mutation-tests the audit machinery itself.

`node audit/upstream-inventory.mjs` recomputes file hashes and identities from
the vendored bytes, verifies the crosswalk is bijective, rejects duplicate or
skip dispositions, checks the exact public subpaths, and verifies the root MIT
notice. `node --test tests/audit/upstream-inventory.test.mjs` proves failures for
a missing/renamed source, renamed unit case, removed browser case, removed type
assertion, duplicate disposition, invented export, invented subpath, skip
disposition, and stale fixture hash.

No source transformation is permitted at this milestone. Future adapted files
must be governed by explicit entries in `allowedTransforms`; an empty ledger is
intentional and fail-closed.

## License provenance

React Draggable is MIT licensed, Copyright 2014–2016 Matt D. Smith and
Copyright 2016–Present STRML. [`LICENSE`](./LICENSE) is byte-identical to both
the pinned tag and published npm notice and accompanies this binding.
