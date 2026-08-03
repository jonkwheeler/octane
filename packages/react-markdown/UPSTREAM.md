# react-markdown upstream contract

## Immutable pin

| Field | Value |
| --- | --- |
| Package | `react-markdown` |
| Version | `10.1.0` |
| Supported range | exactly `10.1.0` |
| Canonical repository | `remarkjs/react-markdown` |
| Canonical commit | `44d2e4a44b37461ab7778d6870c1a9eb36393ad2` |
| npm tarball SHA-256 | `205f5c607c68e1e42b8d7a036326bdb3a105ae55e6469ecfcaf998004609d5f7` |
| License | MIT, retained byte-exact under both evidence boundaries |

`upstream/npm/package/` is the unpacked registry artifact. `upstream/source/`
contains the canonical runtime source, test suite, JSX loader, TypeScript
configuration, package metadata, and license from the pinned commit. The npm
artifact does not publish `test.jsx` or `script/load-jsx.js`, so the canonical
repository supplies that test boundary. The runtime source and license present
in both artifacts are byte-identical.

Run `pnpm --dir packages/react-markdown upstream:verify`. The verifier locks all
16 vendored files, package identity and license, the public API, and all 87
`test.jsx` registrations. Its negative controls must reject source drift,
license drift, a renamed upstream test, a removed inventory row, and a missing
runtime export.

## Public API boundary

| Upstream public item | Planned Octane disposition |
| --- | --- |
| default `Markdown` | Port in U3 |
| `MarkdownAsync` | Port in U4 |
| `MarkdownHooks` | Port in U4 |
| `defaultUrlTransform` | Port source-near in U2 |
| `AllowElement` | Port React-free in U3 |
| `Components` | Port React-free in U3 |
| `ExtraProps` | Port React-free in U3 |
| `HooksOptions` | Port React-free in U3 |
| `Options` | Port React-free in U3 |
| `UrlTransform` | Port React-free in U3 |

`audit/public-api.json` is the machine-readable boundary. A pending row is not
a parity claim: later units must attach executable evidence before release.

## Test boundary

The canonical `test.jsx` contains 87 nested `t.test` registrations. They are
frozen individually in `audit/test-inventory.json`. The pristine lane executes
that vendored file byte-for-byte with its vendored JSX loader, Node test,
React/ReactDOM 19.0.0, and the upstream-declared test dependencies. The 87-entry
`audit/adapted-case-crosswalk.json` binds every pinned source-line identity to a
concrete adapted test identity and integrity-locks its assertion source.

## Early architecture and adoption evidence

`tests/probes/async-component.*` proves the load-bearing server contract before
the HAST projection is implemented: a mapped component typed to return
`OctaneNode | Promise<OctaneNode>` is invoked through an element descriptor,
awaited by `prerender`, preserves nested children, and propagates rejection.

`tests/adoption/` freezes canonical examples from the pinned documentation and
an Apache-2.0 public application consumer before implementation. Its migration
ledger separates ordinary React-to-Octane edits from changes specific to this
package. U6 must execute the frozen corpus; U1 does not treat a source snapshot
as runtime parity evidence.
