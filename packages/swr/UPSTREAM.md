# SWR upstream contract

## Pin and source boundary

| Field | Value |
| --- | --- |
| Package | `swr` |
| Version | `2.4.2` |
| Canonical tag | `v2.4.2` |
| Canonical commit | `f1c1fd855f1e9e7c85755e4232ea4b03c7f81910` |
| Supported range | exactly `2.4.2` |
| License | MIT, © 2023 Vercel, Inc. |
| npm tarball SHA-256 | `948ad899c51e73ca9555e8182946978f367410406fe6c2acb4d1012c509c9982` |

The canonical `src/`, `test/`, package metadata, Jest configurations, root
TypeScript configuration, and license are vendored byte-exact under `upstream/`.
`upstream/SHA256SUMS` locks all 100 vendored evidence files, including the npm
tarball at `upstream/npm/swr-2.4.2.tgz`. The tarball is retained because it
contains compiled condition branches and declarations rather than the canonical
source and tests.

## U1 gate

U1 is not a partial implementation. Authored source modules currently expose
sentinels solely to prove that the repository can pack and resolve the exact
root/subpath/condition graph. U2 may begin only after:

1. the vendored hashes and complete public API oracle pass;
2. the unchanged pinned Jest runtime suite and all three unchanged TypeScript
   projects execute;
3. packed ESM, CommonJS, `react-server`, NodeNext, Bundler, and package metadata
   probes pass, including omitted server-export negatives; and
4. the external-store, Suspense, mutation, streaming, hydration, and devtools
   architecture probes pass.

The full runtime/type crosswalk and per-test dispositions are populated during
the assertion-preserving U2-U5 work. No U1 sentinel is parity evidence.
