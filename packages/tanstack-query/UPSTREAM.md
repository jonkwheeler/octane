# Upstream

- Repository: https://github.com/TanStack/query
- Release tag: `@tanstack/react-query@5.101.3`
- Commit: `172ea730d03564a6f3df995b50c42d6ccad9b603`
- Package: `@tanstack/react-query@5.101.3`
- Source root: `packages/react-query/src`
- Test root: `packages/react-query/src/__tests__`
- License: MIT
- npm tarball SHA-256: `1effc6149825d93d72c8a735d9790ee7cb4d96fa149749c7eb2bba39c180755f`

The tagged repository contains the upstream runtime and compile-time suites.
The published npm artifact contains source and declarations but omits those
tests, so provenance remains `recorded-unverified` until those suites are
fetched from the canonical tag, registered as pristine/adapted lanes, and
verification is established. Until then, `pnpm react-parity:check` only
validates manifest metadata for this binding (it does not `run-required`).

Current executable React-parity evidence is the three same-fixture React/Octane
differential scenarios. The Octane suspense adaptation and DOM-free SSR contract
remain ordinary package tests (octane-only divergence / framework contract); they
are not counted as React-parity evidence. A repository-authored public type
contract lane is recorded as optional until pristine/adapted type suites land.
