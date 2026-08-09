# Upstream

- Repository: https://github.com/TanStack/store
- Release tag: `@tanstack/react-store@0.11.0`
- Commit: `83e2978f627ec53616249b2bda1037749b18b6ab`
- Package: `@tanstack/react-store@0.11.0`
- Source root: `packages/react-store/src`
- Test root: `packages/react-store/tests`
- License: MIT
- npm tarball SHA-256: `00e8fa1891d1b70a83838b15aec65ea5817c7b88aa737ead07dea9dbce14897f`

The tagged repository contains the upstream runtime and compile-time suites.
The published npm artifact contains source and declarations but omits those
tests, so provenance remains `recorded-unverified`. `upstreamSuites.runtime`
and `upstreamSuites.types` remain `present` because the repository pin has
those suites; promoting them into pristine runtime/type lanes with complete
dispositions is open follow-up work before provenance can move to `verified`.

The pinned repository suite is vendored under `packages/tanstack-store/upstream/`
and adapted one-for-one into
`packages/tanstack-store/tests/_fixtures/upstream/index.tsrx`.

This bounded harness currently executes:

- the one-for-one adapted upstream runtime suite through the `tanstack-store`
  Vitest project (`testExecution.include` lists only that wrapper);
- one exact shared React/Octane differential interaction fixture;
- the repository-authored adapted type contract.

The upstream `_useStore` describe block (actions + setState cases) is not
applicable in the adapted suite: `@octanejs/tanstack-store` intentionally omits
that experimental export. Those identities are classified outside adapted parity
evidence; `tests/conformance/experimental-use-store.parity.test.ts` records the
omission as an ordinary package divergence test.

Documented Octane-only divergences and SSR stay ordinary package tests outside
React-parity ownership until pristine upstream suites land.
