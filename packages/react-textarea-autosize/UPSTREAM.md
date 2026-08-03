# react-textarea-autosize upstream evidence

- Package: `react-textarea-autosize@8.5.9`
- npm tarball SHA-1: `ab8627b09aa04d8a2f45d5b5cd94c84d1d4a8893`
- npm tarball SHA-256: `648a3eae6d4a8708e215b7272907ba018b5f77430acbb568a2c5aebd238ce945`
- npm integrity: `sha512-U1DGlIQN5AwgjTyOEnI1oCcMuEr1pv1qOtklB2l4nyMGbHzWrI0eFsYK0zos2YWqAolJyG0IWJaqWmWj5ETh0A==`
- Source commit: `ed1894cd8611d99fbea1c47adcf6ee522b1030fd`
- License: MIT, copyright 2013 Andrey Popp

The npm artifact supplies the published distribution and package-condition boundary. The exact repository commit supplies the source and two upstream Jest artifacts absent from the tarball. `upstream/` is byte-exact development evidence and is excluded from publication.

## Public surface crosswalk

| Upstream surface | Octane surface | Status | Evidence |
| --- | --- | --- | --- |
| default `TextareaAutosize` | default `TextareaAutosize` | Ported | runtime, SSR, hydration, and browser lanes |
| `TextareaAutosizeProps` | `TextareaAutosizeProps` | Ported with native event types | paired type lanes |
| `TextareaHeightChangeMeta` | `TextareaHeightChangeMeta` | Ported | paired type lanes |
| root conditional exports | root source export with matching conditions | Ported | packed resolver matrix |
| `./package.json` | `./package.json` | Ported | packed resolver matrix |

## Test disposition

| Upstream artifact | Disposition |
| --- | --- |
| `src/__tests__/index.test.js` | Run pristine with React and adapted case-for-case under `tests/upstream/` |
| `src/__tests__/__snapshots__/index.test.js.snap` | Retained pristine; equivalent adapted DOM assertions avoid framework snapshot internals |

The public callback remains named `onChange`, but Octane supplies a native input event rather than a React SyntheticEvent. The binding guarantees per-edit timing, target/currentTarget value during dispatch, bubbling, cancellation, and callback ordering. React-only event identity and fields are documented divergences.
