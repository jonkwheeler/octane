# @solana/react upstream contract

## Pin and source boundary

| Field | Value |
|---|---|
| Package | `@solana/react` |
| Version | `7.0.0` |
| Canonical tag commit | `58df993f4bea388121a872b33038c6af0ca3dd90` |
| Supported upstream range | exactly `7.0.0` |
| React oracle | `19.2.3` with `@types/react@19.2.7` |
| License | MIT |

The npm package publishes `src/` and built `dist/`, but the repository at tag
`v7.0.0` is the authoritative source for the full unit and type suites. The
byte-exact `packages/react` directory from that commit is vendored under
`upstream/` and locked file-by-file by `upstream/SHA256SUMS`. It is excluded
from the published package by the explicit `files` allowlist.

Framework-neutral Kit operations stay on `@solana/kit@7.0.0`. This package is
the Octane reactive UI seam: client provider/store, Wallet Standard discovery,
TanStack request queries, and an explicit-action transaction executor.

Run `pnpm --dir packages/solana-react upstream:verify` to verify every vendored
byte.

## Runtime export crosswalk

| Upstream export | Octane disposition | Evidence |
|---|---|---|
| `ClientProvider`, `ClientProviderProps`, `ClientContext` | Ported; sync clients only (async promise/Suspense clients are a recorded divergence) | `tests/upstream/client-provider.test.ts`, pristine ClientProvider suite |
| `useClient` | Ported with slot forwarding; throws a plain `Error` instead of `SolanaError` | `tests/upstream/client-provider.test.ts` |
| `useClientCapability`, `UseClientCapabilityConfig` | Ported with slot forwarding; throws a plain `Error` instead of `SolanaError` | `tests/upstream/use-client-capability.test.ts` |
| `useRequest` / `useRequestResult` | Not ported; request work goes through `@octanejs/solana-react/query` | gap / out of scope for this surface |
| `useRequestQuery` (`@solana/react/query`) | Ported as `useRequestQuery` over `@octanejs/tanstack-query` | `tests/query.test.ts` (Octane conformance; not parity-owned) |
| `useSubscription*` / `useTrackedData*` | Deferred pending streamed-query lifecycle characterization | gap |
| `@solana/react/swr` | Excluded; Octane has no SWR binding | gap |
| Selected-wallet provider / signer hooks | Replaced by structural `createWalletStore` (no React / `@wallet-standard/react` types on the public boundary) | `tests/wallet.test.ts` (Octane conformance) |
| Sign-in / sign-message / sign-transaction hooks | Represented by `createTransactionExecutor` explicit-action flow | `tests/transactions.test.ts` (Octane conformance) |
| `useAction`, `useLatest`, `useReactiveStoreLifecycle`, `staticStores` | Internal upstream helpers; not public Octane surface | out of scope |

## Test-suite disposition

Parity-owned adapted cases live only under `tests/upstream/`. Ordinary
Octane-authored conformance stays in `tests/*.test.ts` and is outside
`testExecution` ownership.

| Upstream artifact | Disposition |
|---|---|
| `src/__tests__/ClientProvider-test.browser.tsx` | Pristine-run in full. Sync publish/nested/missing-provider cases adapted in `tests/upstream/client-provider.test.ts`. Async client / Suspense cases are pristine-only (Octane `ClientProvider` accepts a resolved client). |
| `src/__tests__/useClientCapability-test.browser.tsx` | Pristine-run in full. Present/missing/partial-array cases adapted in `tests/upstream/use-client-capability.test.ts`. |
| `src/query/__tests__/useRequestQuery-test.browser.tsx` | Present at the pin; not yet adapted. Octane request-query contracts are covered by non-parity `tests/query.test.ts`. |
| Remaining `src/__tests__/*`, `src/swr/**`, subscription/tracked suites | Out of scope for this surface (see crosswalk gaps). |
| `src/**/__typetests__/*` | Insufficient for one-for-one execution against the narrower Octane surface; repo-authored probes cover the overlapping public API. |

## Intentional divergences

- Missing-provider and missing-capability failures throw plain `Error` messages rather than `@solana/kit` `SolanaError` codes.
- `ClientProvider` does not accept a `Promise<Client>` and does not suspend; callers resolve async plugin setup before mount.
- Wallet and transaction APIs are Octane-native rather than upstream selected-wallet / sign-* hooks.
