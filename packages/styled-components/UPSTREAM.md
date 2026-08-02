# Upstream

- Repository: https://github.com/styled-components/styled-components
- Commit: `e0663410f631e0ce82681947edf03bfabd6aef9c`
- Package: `styled-components@6.4.3`
- License: MIT
- npm tarball SHA-256: `cfc845f944613860155a65afb548b0ac0d234af56ac332e14f99ed150ab38549`

The implementation is ported from the pinned upstream package. React component,
forward-ref, hook, JSX, and server-sheet boundaries are adapted to Octane.

The canonical pinned repository contains runtime and type suites, but the
published npm artifact does not contain them. This repository therefore records
the source provenance as unverified rather than claiming a pristine-upstream
run. Required lanes execute six exact differential fixtures against the pinned
React package, eight documented adaptation contracts, and the Octane type
contract. Every remaining local test is classified as an Octane framework
contract. A future verified provenance lane must vendor and authenticate the
canonical upstream suites before it can claim their execution.
