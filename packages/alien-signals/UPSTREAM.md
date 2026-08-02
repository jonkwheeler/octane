# Upstream crosswalk

## Pin

- React package: `react-alien-signals@0.3.0`
- Canonical repository: <https://github.com/Rajaniraiyn/react-alien-signals>
- Immutable commit: `6d883959ddf25a3f486451ff8abff60eb989671c`
- Advertised compatibility: `react-alien-signals@0.3.0`
- Reused core: `alien-signals@1.0.4` (the upstream peer range is `~1.0.4`)
- React oracle: the pinned repository's `src/index.test.ts`, authored for React 18+

The published tarball supplies the built single-entry package. The canonical repository at the
commit above supplies the TypeScript source, test suite, and MIT license. Those files are vendored
byte-for-byte under [`upstream/`](./upstream/) and are excluded from the published package by the
manifest's explicit `files` list.

Run `pnpm --dir packages/alien-signals upstream:verify` to reject removed or modified pinned
evidence. The checksum ledger covers the source, complete upstream test file, and license.

## Export crosswalk

The pinned package has one public entry point, `react-alien-signals`.

| Upstream export | Octane disposition | Evidence |
| --- | --- | --- |
| `WritableSignal` | Ported | [`core.test.ts`](./tests/core.test.ts), [`public-api.test-d.ts`](./typetests/public-api.test-d.ts) |
| `createSignal` | Ported over the unchanged core; the wrapper makes the advertised functional setter contract real | [`core.test.ts`](./tests/core.test.ts), [`hooks.test.ts`](./tests/hooks.test.ts) |
| `createComputed` | Ported over the unchanged core | [`core.test.ts`](./tests/core.test.ts) |
| `createEffect` | Ported over the unchanged core | [`core.test.ts`](./tests/core.test.ts), [`lifecycle.test.ts`](./tests/lifecycle.test.ts) |
| `createSignalScope` | Ported over the unchanged core | [`core.test.ts`](./tests/core.test.ts), [`lifecycle.test.ts`](./tests/lifecycle.test.ts) |
| `useSignal` | Ported with Octane manual slot forwarding | [`hooks.test.ts`](./tests/hooks.test.ts), `packages/octane/tests/external-hook-slot.test.ts` |
| `useSignalValue` | Ported; accepts readable computed signals as the upstream docs and runtime intend | [`hooks.test.ts`](./tests/hooks.test.ts), [`public-api.test-d.ts`](./typetests/public-api.test-d.ts) |
| `useSetSignal` | Ported with stable identity and signal replacement | [`hooks.test.ts`](./tests/hooks.test.ts) |
| `useSignalEffect` | Ported with post-commit ownership and deterministic cleanup | [`lifecycle.test.ts`](./tests/lifecycle.test.ts), [`render-safety.test.ts`](./tests/ssr/render-safety.test.ts) |
| `useSignalScope` | Ported with a cancellation-safe controller and post-commit ownership | [`lifecycle.test.ts`](./tests/lifecycle.test.ts), [`render-safety.test.ts`](./tests/ssr/render-safety.test.ts) |
| `useComputed` | Ported; the caller's dependency list is passed directly to memoization | [`hooks.test.ts`](./tests/hooks.test.ts) |

`ReadableSignal` and `DependencyList` are explicit Octane type exports. They describe public call
shapes that the upstream implementation documents but does not name as exports.

## Test disposition

The pinned repository contains one runtime test file, `src/index.test.ts`. It is vendored unchanged
at [`upstream/src/index.test.ts`](./upstream/src/index.test.ts). Its observable cases are adapted as
follows; React renderer mechanics (`renderHook`, `act`, batching) are replaced by compiled TSRX and
the Octane testing library.

| Upstream cases | Octane evidence |
| --- | --- |
| writable, computed, nested computed, computed dependencies, signal updates in effects | [`core.test.ts`](./tests/core.test.ts) |
| effect creation, scope creation, stopped-scope cleanup | [`core.test.ts`](./tests/core.test.ts), [`lifecycle.test.ts`](./tests/lifecycle.test.ts) |
| `useSignal`, `useSignalValue`, `useSetSignal`, functional and multiple updates | [`hooks.test.ts`](./tests/hooks.test.ts) |
| `useComputed` updates, stable dependencies, changed dependencies, and render-loop regression | [`hooks.test.ts`](./tests/hooks.test.ts) |
| effect cleanup, subscription cleanup, repeated mount/unmount | [`lifecycle.test.ts`](./tests/lifecycle.test.ts) |
| scope cleanup plus cancellation before commit and after manual stop | [`lifecycle.test.ts`](./tests/lifecycle.test.ts) |
| undefined/null values and signal identity replacement | [`hooks.test.ts`](./tests/hooks.test.ts) |
| concurrent/batched updates | Covered as sequential core notifications; React scheduler batching itself is not applicable to Octane |

Octane-only framework contracts are classified separately: SSR render safety in
[`render-safety.test.ts`](./tests/ssr/render-safety.test.ts), hydration adoption in
[`hydration.test.ts`](./tests/hydration.test.ts), manual slot isolation in
`packages/octane/tests/external-hook-slot.test.ts`, and central playground registration in
`playground/octane/src/demos/AlienSignals.test.ts`.

## Intentional divergences

- Effects and scopes begin after the client commit. React's adapter also uses `useEffect`, but the
  Octane port additionally guarantees that a stop controller called before commit remains stopped.
- `useSignalValue` accepts any readable signal rather than repeating the upstream declaration's
  writable-only narrowing.
- Octane hooks carry compiler slots internally; this is invisible to consumers and required for
  stable composition outside `.tsrx` modules.
