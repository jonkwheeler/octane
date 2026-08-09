# Upstream

- Repository: https://github.com/TanStack/virtual
- Release tag: `@tanstack/react-virtual@3.14.5`
- Commit: `151e9f47abd4ef2d3b11936c04be8908e6bd0607`
- Package: `@tanstack/react-virtual@3.14.5`
- Source root: `packages/react-virtual/src`
- Test root: `packages/react-virtual/tests` and `packages/react-virtual/e2e`
- License: MIT
- npm tarball SHA-256: `e93b937aa9cdc910ab9dddae1c342acee8c2d45b5574298383e204b5a94b718e`

The tagged repository contains jsdom runtime tests and browser e2e suites; the
published npm artifact omits them. This binding therefore records
`upstreamSuites.runtime` / `types` as `absent` and keeps provenance
`recorded-unverified` until pristine upstream and one-for-one adapted full-suite
lanes (plus paired type evidence) can execute under `verified` provenance.

Until then, the optional differential lane only documents four same-fixture
React/Octane scenarios. Ordinary CI runs those scenarios plus Octane-only
nested-flush, SSR, and harness-setup contracts; `react-parity:check` validates
manifest metadata only. Real-layout browser coverage remains an explicit gap.
