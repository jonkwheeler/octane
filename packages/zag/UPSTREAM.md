# @zag-js/react upstream contract

## Pin and source boundary

| Field | Value |
|---|---|
| Package | `@zag-js/react` |
| Version | `1.42.0` |
| Canonical tag commit | `df65e4c87c75a1c84eb6eb08a8e30dac0e1bb77f` |
| Supported upstream range | exactly `1.42.0` |
| React oracle | `19.2.7` |
| Canonical archive SHA-256 | `7d7afdce41cbdc8282b5917bb507e0bec3ffafee4f9b447528d07598d1be5134` |
| License | MIT, © Chakra UI |

Repository: `https://github.com/chakra-ui/zag.git`. The npm artifact publishes
compiled `dist/` output. The framework adapter source at this pin lives under
`packages/frameworks/react` in the canonical repository. Framework-agnostic
`@zag-js/core`, `@zag-js/store`, `@zag-js/types`, and `@zag-js/utils` at the same
version are reused unchanged and are not reimplemented here.

## Runtime export crosswalk

| Upstream export | Octane disposition | Evidence |
|---|---|---|
| `useMachine` | Ported to Octane hooks in `src/machine.ts` | `tests/conformance/machine.test.ts`, `tests/differential/machine.test.ts` |
| `normalizeProps` | Ported in `src/normalize-props.ts` | `tests/conformance/upstream-surface.test.ts` |
| `Portal` | Ported in `src/portal.ts` | `tests/conformance/machine.test.ts`, `tests/ssr/server.test.ts` |
| `mergeProps` | Re-exported from `@zag-js/core` | `tests/conformance/upstream-surface.test.ts` |
| `useSyncExternalStore` | Re-exported from Octane | `tests/conformance/upstream-surface.test.ts` |

## Test-suite disposition

Upstream `@zag-js/react` does not ship a standalone adapter suite that this port
runs as a pristine lane. Parity evidence is the repo-authored differential case
registered in `audit/react-parity.json` under the `zag-differential` Vitest
project (`testExecution.group: react-parity`). Conformance and SSR tests remain
in the ordinary `zag` / `zag-ssr` projects.
