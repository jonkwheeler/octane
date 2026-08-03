# Apollo Client upstream ledger

## Pin

- Package: `@apollo/client@4.2.6`
- Repository: `https://github.com/apollographql/apollo-client.git`
- Release tag: `@apollo/client@4.2.6`
- Annotated tag object: `37b0c4183802fd249d3a05f6da4bcb2b06c14f20`
- Commit: `f934b60720fc828a61e04b00988eeefb83d273bc`
- npm tarball SHA-256: `d2f17af8384c1f572cb3133153fe292546f4bb2768afcf30cc02091990ee057f`
- License: MIT
- React oracle: workspace React 19.2.7

The binding reuses Apollo Client's framework-neutral core and mirrors the pinned React adapter layout with Octane hook and component implementations.

## Export crosswalk

The root and `testing` entry points reuse Apollo's framework-neutral exports. The `react`, `react/internal`, `react/ssr`, and `testing/react` entry points expose the complete documented Octane adapter surface recorded in `status.json`; `exports.test.ts` and the executable public type suite guard that surface. React Server Components and the React Compiler runtime entry are explicit gaps because Octane does not consume React's runtime/compiler protocols.

## Test-suite disposition

The tagged repository contains more than forty React hook, context, cache, preloader, SSR, MockedProvider, snapshot, and GraphQL-version-specific runtime artifacts plus repository-wide type integration tests. They are present but not executed unchanged in this recorded-unverified retrofit. Existing Octane client, hydration, SSR, export, and type suites cover the supported surface. The bounded differential lane runs the same cache-only `ApolloProvider`/`useQuery` fixture against the pinned React adapter and Octane, avoiding network scheduling as an uncontrolled oracle input.
