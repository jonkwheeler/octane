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
tests, so provenance remains recorded-unverified. Required evidence runs the
same store, atom, action, and context fixture through React and Octane, checks
the documented experimental-export divergence, exercises DOM-free SSR, and
compiles the repository-authored public type contract.
