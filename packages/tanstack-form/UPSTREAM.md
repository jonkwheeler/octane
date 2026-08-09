# Upstream

- Repository: https://github.com/TanStack/form
- Release tag: `@tanstack/react-form@1.33.2`
- Commit: `5d1128141a705ebb24ade1275b3117bb4c8b1bdc`
- Package: `@tanstack/react-form@1.33.2`
- Source root: `packages/react-form/src`
- Test root: `packages/react-form/tests`
- License: MIT
- npm tarball SHA-256: `db24c9288d56428e8f67742ca9e0fcf314917c21c8d8d4ff095aee8043602606`

The canonical tagged repository contains runtime and compile-time suites. The
published npm artifact contains source and declarations but omits those tests,
so provenance remains `recorded-unverified`. `upstreamSuites.runtime` and
`upstreamSuites.types` remain `present` because the repository pin has those
suites; promoting them into pristine runtime/type lanes with complete
dispositions is open follow-up work before provenance can move to `verified`.

This bounded harness currently executes:

- the one-for-one adapted `createFormHook`, `onChangeListenTo`, `useField`,
  `useForm`, and `useFormGroup` wrappers through the `tanstack-form` Vitest
  project (`testExecution.include` lists only those files);
- one exact shared React/Octane differential interaction fixture;
- the repository-authored adapted type contract.

Documented Octane-only divergences and SSR stay ordinary package tests outside
React-parity ownership until pristine upstream suites land.
