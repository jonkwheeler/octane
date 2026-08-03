# Radix React upstream ledger

`@octanejs/radix` targets the unified `radix-ui@1.6.4` package from
`https://github.com/radix-ui/primitives.git`.

## Immutable pin

- Package: `radix-ui@1.6.4`
- Release commit: `eb8b851619a655e278c819b959be0d3924b0ada8` (`New release (1.6.4)`)
- npm archive SHA-256: `034b075b204bcd82bc7d52c82954e5204e7aa5493d34f3b534bc0440c785e571`
- npm lock integrity: `sha512-Kpgb9sx08toOydBK42//0N3MqIPlqjHcY39CYuGG8+7DrF6+NTfAnc3o+f1kvoKzG6cI56ri7Z45XEBQqG1QqQ==`
- Supported range: exactly `1.6.4`
- License: MIT
- React oracle: workspace-pinned React and React DOM

The release has no unified-package git tag or npm `gitHead`. The immutable commit above is the
repository release commit whose package versions and unified manifest are `1.6.4`.

## Source and test boundary

The unified package has 55 direct workspace dependencies. Following those dependencies through the
pinned monorepo produces 61 packages, 207 source files, and 38 canonical runtime test files. The
byte-exact package directories and root MIT license are vendored under `upstream/repository`;
`upstream/SHA256SUMS` authenticates all 452 files. The executable checker rejects file, byte,
package-graph, source, or test inventory drift.

The 38 canonical tests are preserved as provenance but are not adapted or executed by Octane. The
binding therefore remains `recorded-unverified`; vendoring is not behavioral evidence.

## Executable evidence

The repo-authored differential lane runs all 16 collected same-fixture scenarios against both
`@octanejs/radix` and the pinned real `radix-ui` package. It compares byte-identical DOM across
representative primitives and interactions. A separate audit lane authenticates the complete
transitive boundary and keeps the two renderer adaptations structured and executable.

The other local tests are Octane framework contracts. They cover additional component behavior but
are not counted as React parity. The differential suite is bounded jsdom evidence, not exhaustive
coverage of portals, focus management, pointer geometry, observers, SSR, hydration, or all 38
canonical upstream suites.

## Intentional adaptations and open coverage

- `Slot` and `asChild` consume Octane element descriptors rather than React children-position JSX.
- React `forwardRef` wrappers become Octane ref-as-prop components.
- SSR and hydration coverage for overlay and portal components remains open.
