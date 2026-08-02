# Upstream Drei audit

This port targets the immutable `@react-three/drei@10.7.7` release:

- repository: `https://github.com/pmndrs/drei`;
- tag: `v10.7.7`;
- tag commit: `b8b99fd4ca1dfb8d821335671320512daa6efea4`;
- package: `@react-three/drei@10.7.7`;
- React oracle: React 19 with `@react-three/fiber@9.6.1`;
- Three compatibility range: `three >=0.159`.

## Source and evidence boundary

`upstream/` is a byte-exact development-only snapshot of the release's `src/`,
`test/`, package manifest, TypeScript configuration, and MIT license. It is not
included in the published package. The registry artifact supplies the executable
React oracle and declaration surface; the tagged repository supplies authored
source, stories, test configuration, and the sole upstream end-to-end suite.

Drei has no focused unit-test corpus at this pin. Its observable component
contracts are primarily expressed through Storybook stories. Those artifacts are
therefore inventoried as upstream evidence, then exercised through paired React
and Octane characterization fixtures at the appropriate DOM, Three-scene, or
real-browser observation boundary.

The complete tagged test tree contains exactly four artifacts, all under
`test/e2e/`: `App.tsx`, `e2e.sh`, `snapshot.test.ts`, and its Linux PNG snapshot.
They form one whole-gallery Playwright screenshot case. Their byte hashes and
individual dispositions are recorded in `audit/upstream-test-artifacts.json`.
That single visual smoke test is retained as upstream evidence but is
insufficient as an export-level runtime suite, so it is not mislabeled as a
one-for-one adapted lane.

The tag contains no upstream type-test suite. The upstream `tsconfig.json`
compiles package source, while the `@ts-expect-error` comments in that source are
inventoried separately so removing one makes the audit fail. The port's
`typetests/` are repository-authored API checks and continue to run in package
typecheck; they are not represented as adapted upstream type parity.

## Executable parity evidence

`audit/react-parity.json` registers the complete repository-authored Vitest suite
and a focused paired React/Octane canary with the global `react-parity:check`
harness. `audit/test-classifications.json` gives every port-authored test file
exactly one disposition. Paired files import the pinned React Drei oracle in the
test body; renderer-configuration and audit-guard files are explicitly
Octane-only and do not count as React-parity evidence.

`audit/runtime-evidence.json` hashes every test file and every collected assertion
inventory. `audit/upstream-test-artifacts.json` is the empty transformation
ledger: no upstream test or type suite was adapted. The audit guard includes
negative controls for a skipped test file, deleted assertion, removed upstream
`@ts-expect-error` inventory entry, and fabricated upstream type suite.

## Completeness contract

`audit/upstream-crosswalk.json` is generated from the pinned public runtime and
type surfaces. Every public web export must have an Octane implementation and
executable evidence before this package claims parity. Missing, placeholder, or
unclassified entries fail validation; intentional Octane differences require a
consumer-visible rationale and evidence from both implementations.

## Intentional renderer divergence

`View` supports Drei's inline Canvas form, including tracked rectangles, portal
scenes, scissor rendering, event computation, and render ordering. React Drei
also lets the same component render in a DOM root and transports its Three
children through `View.Port` using `tunnel-rat`. Octane components are
statically owned by one renderer, so a Three component cannot switch to the DOM
renderer or move authored children between independent DOM and Three roots.
Calling `View` from a DOM root therefore raises Octane's renderer-boundary
diagnostic, and `View.Port` remains a callable, type-compatible no-op.
