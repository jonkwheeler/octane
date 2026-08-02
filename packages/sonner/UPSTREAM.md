# Upstream provenance

This port targets the published `sonner@2.0.7` runtime and the matching
`v2.0.7` Git tag at commit `3ba7aa17ab7e8101b9cf4893936f873b0d4769b3`.

| Input | Location | Integrity |
| --- | --- | --- |
| npm tarball | `https://registry.npmjs.org/sonner/-/sonner-2.0.7.tgz` | SHA-256 `eb0f5dd35d890d38e8dcba1b242e9ac38cf45cc92c02aa914f144d98cfa7ce8f` |
| Git tag | `https://github.com/emilkowalski/sonner/tree/v2.0.7` | commit `3ba7aa17ab7e8101b9cf4893936f873b0d4769b3` |

The npm artifact contains the compiled runtime, declarations, styles, README,
package metadata, and MIT license. It does not contain the upstream test suite,
so this repository does not claim pristine-upstream test execution. The bounded
required differential lane instead runs the same fixture against the published
React package and the Octane port, with exact test-name selection. A separate
adapted lane authenticates the three documented renderer-specific divergences.

When updating the pin, fetch and checksum the new npm artifact, resolve the
matching Git tag, review the upstream source and test inventory, refresh every
manifest hash, and rerun both required lanes plus the global parity audit.
