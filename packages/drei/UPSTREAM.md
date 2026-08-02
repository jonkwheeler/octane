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

## Completeness contract

`audit/upstream-crosswalk.json` is generated from the pinned public runtime and
type surfaces. Every public web export must have an Octane implementation and
executable evidence before this package claims parity. Missing, placeholder, or
unclassified entries fail validation; intentional Octane differences require a
consumer-visible rationale and evidence from both implementations.
