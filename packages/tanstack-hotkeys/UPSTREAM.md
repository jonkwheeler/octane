# TanStack React Hotkeys upstream ledger

`@octanejs/tanstack-hotkeys` targets `@tanstack/react-hotkeys@0.10.0` from
`https://github.com/TanStack/hotkeys.git`.

## Immutable pin

- Tag: `@tanstack/react-hotkeys@0.10.0`
- Resolved commit: `c73a3a167c979d500e1008341ecad096a6c4e635`
- npm archive SHA-256: `1ac05739e0b649ffbc5fb7954fcd7106456de9c337660ca5db3242ae14b9758d`
- npm lock integrity: `sha512-GwOSndI5j3qBVYTmgP1mYyRTnlxb2MS17cwGlsavSxMQPSnmDf+m3LzMIpRMs+3zzQMjg3cYhHsFYizYlFI2tw==`
- Supported range: exactly `0.10.0`
- License: MIT
- React oracle: workspace-pinned React and React DOM
- Framework-neutral core: exact `@tanstack/hotkeys@0.8.0`, reused by both adapters

## Source, exports, and suites

The byte-exact tagged adapter directory and root license are vendored under `upstream/`.
`SHA256SUMS` authenticates all 26 files: 13 adapter source files, four runtime test files, and
nine package/build/documentation files. The runtime suite has 41 cases. Upstream's `test:types`
script only compiles package source and includes no dedicated type-assertion artifacts, so the type
suite is classified `insufficient`.

`audit/upstream-crosswalk.json` accounts for both published entrypoints, all 22 adapter exports,
the byte-identical core wildcard re-export, and all four canonical runtime test files. The runtime
suite is preserved but not adapted in full, so the binding remains `recorded-unverified`.

## Executable evidence

One repo-authored differential runs the same compiled fixture against the Octane and React
adapters. It exercises single and multiple shortcut registration, a two-key sequence, dynamic
enabled state, and cleanup. Existing local tests remain Octane framework contracts and are not
counted as React parity. This jsdom lifecycle is representative, not exhaustive evidence for all
41 upstream cases or every recorder, held-key, target-ref, and provider option.

The only structured adapter divergence is the target-ref type: Octane accepts a plain
`{ current }` object instead of `React.RefObject`; runtime ref detection and behavior otherwise
follow upstream.
