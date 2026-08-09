# Upstream provenance

- Repository: https://github.com/47ng/nuqs
- Release: `v2.9.1`
- Commit: `b72c526f9dd94bf5a105b320fcb5955cbc68a8b3`
- Source and test root: `packages/nuqs/src`
- License: MIT
- Archive SHA-256: `23b331aa1371c760b349b81a26ca87c505e5991c14e23b6fd0ab8759dc3784c5`

Nuqs colocates runtime, browser, and type tests with source. This binding does
**not** vendor a pristine upstream runtime or type suite, and it does not ship
one-for-one adapted copies of those suites (`upstreamSuites.runtime` and
`upstreamSuites.types` are therefore `absent`). Provenance is `verified` with
repo-authored evidence: a same-fixture differential against `nuqs@2.9.1`, full
adapted-octane Vitest inventories for conformance/divergence and Node server
lanes, plus paired pristine (`tsc` vs published `nuqs`) and adapted
(`tsrx-tsc` vs `@octanejs/nuqs`) public-API typetests.
