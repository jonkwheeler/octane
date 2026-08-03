# Upstream provenance

This U1 audit targets the complete published `react-select` package, including
all six JavaScript API entry points. It is not a proposal for an unstyled or
headless subset.

| Field | Pinned value |
| --- | --- |
| Package | `react-select@5.10.2` |
| License | MIT |
| npm integrity | `sha512-Z33nHdEFWq9tfnfVXaiM12rbJmk+QjFEztWLtmXqQhz6Al4UZZ9xc0wiatmGtUOCCnHN0WizL3tCMYRENX4rVQ==` |
| npm SHA-1 | `8dffc69dfd7d74684d9613e6eb27204e3b99e127` |
| Canonical tag object | `dd5ed998713af85f16c31c1f093d71d3c1e0e1bd` |
| Canonical commit | `052e864b4990a67c4ee416851c34d1eb7b58267b` |
| License SHA-256 | `d736dd18c7e53f88217fa2106c748f1a1687bb91d69a1f673fa685269402d784` |
| Published files | 138 |
| Published unpacked bytes | 725,500 |

The published API has root, `base`, `async`, `animated`, `creatable`, and
`async-creatable` JavaScript entry points plus `package.json`. The canonical
source boundary contains 61 files under `packages/react-select/src`, including
five runtime test files, five snapshot artifacts, and 79 Jest cases at the
pinned commit. The root package directly depends on `@emotion/react`,
`@emotion/cache`, and `react-transition-group`.

The MIT license permits copying, modifying, and distributing an Octane port as
long as the copyright and permission notice are retained. The canonical package
source, five Jest suites, five snapshots, package metadata, and license are
preserved under `upstream/`. `upstream/SHA256SUMS` locks all 63 files
byte-for-byte. Run `pnpm --filter @octanejs/react-select-u1 upstream:verify` to
reject a changed, missing, or additional upstream artifact. The six public
JavaScript entry points and all 20 runtime exports are tracked fail-closed in
`audit/export-crosswalk.json`.
