# Upstream provenance

- Repository: https://github.com/47ng/nuqs
- Release: `v2.9.1`
- Commit: `b72c526f9dd94bf5a105b320fcb5955cbc68a8b3`
- Source and test root: `packages/nuqs/src`
- License: MIT
- Archive SHA-256: `23b331aa1371c760b349b81a26ca87c505e5991c14e23b6fd0ab8759dc3784c5`

Nuqs colocates runtime, browser, and type tests with source, so
`upstreamSuites.runtime` and `upstreamSuites.types` are `present`. Those suites
have not been vendored and adapted one-for-one yet, so the parity manifest
remains `recorded-unverified` until required pristine-upstream and adapted-octane
lanes (and upstream-suite type evidence) exist.

Interim evidence that does run today:

- a same-fixture differential against `nuqs@2.9.1`
- repo-authored Octane-only conformance and divergence probes (ordinary Vitest
  coverage; not counted as adapted upstream-suite parity)
- paired pristine (`tsc` vs published `nuqs`) and adapted (`tsrx-tsc` vs
  `@octanejs/nuqs`) public-API typetests with structural import-only verification
