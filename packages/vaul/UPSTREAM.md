# Upstream provenance

This binding targets `vaul@1.1.2` from
[`emilkowalski/vaul`](https://github.com/emilkowalski/vaul), tag `v1.1.2`, commit
`73d06cdd3fd990bf4b83214cfe240c246908af0d`.

The exact React source, complete Playwright test boundary (Next demo app, specs,
Playwright config, workspace metadata), package metadata, README, stylesheet, and
MIT license used for the port are retained under `upstream/`, vendored from the
tagged git repository. Byte inventory is locked by `upstream/SHA256SUMS`. The npm
tarball SHA-256 is `d062e21bae0c864c3559707c0451edabc0aac32a22eda239064a3faa7c9f1b21`
(published package surface only). Run `pnpm --dir packages/vaul upstream:check` to
verify the vendored evidence.

## Source boundary

Upstream's React drawer implementation under `upstream/src` is re-authored in
`packages/vaul/src/index.tsrx` against `@octanejs/radix` Dialog primitives and
Octane hooks. The published stylesheet is reused as `src/style.css`.

## Test-suite disposition

Upstream ships a Playwright suite (`package.json` script `test`: `playwright test`)
whose specs live under `test/tests/` and depend on the Next.js demo app under
`test/`. The complete tagged repository test boundary is vendored under
`upstream/` (source, demo app, specs, `playwright.config.ts`, workspace files).
A pristine-upstream lane (`vaul-pristine-upstream`) runs that suite unchanged
against published React `vaul@1.1.2` via `tests/upstream-original.test.ts`.
Adapted Vitest / real-browser lanes remain the Octane-side executable evidence
in `audit/react-parity.json`. Port-authored test classifications live in
`audit/test-classifications.json`.

| Upstream artifact | Disposition |
| --- | --- |
| `test/tests/base.spec.ts` | **Adapted (partial).** Open/close through trigger and `Drawer.Close`, plus controlled close: `tests/drawer.test.ts` (`// Per …:10`, `:27`, `:35`). Open-state semantic snapshot vs published React Vaul: `tests/react-oracle.test.ts` (`// Per …:10`). Browser lane covers open/close focus/styles/cleanup. Upstream drag-down close (`:49`) remains a gap; the unpaired snap-point mid-drag-stays-open contract lives in ordinary `vaul-browser-conformance`, not parity evidence. `defaultOpen` and context-menu-cancel drag remain gaps. |
| `test/tests/controlled.spec.ts` | **Adapted (partial).** Overlay dismiss with `open` + `onOpenChange` is covered by the controlled fixture path in `tests/drawer.test.ts` and browser close. Overlay non-dismiss when only `open` is passed remains a gap. |
| `test/tests/initial-snap.spec.ts` | **Adapted (partial).** Initially-open snap fixture asserts open + snap height on load: `tests/browser/vaul.browser.test.ts` (`// Per …:24`). Upstream's commented drag-snap cases stay unported. |
| `test/tests/with-handle.spec.ts` | **Adapted.** Handle click cycles snap points on the initially-open fixture: `tests/browser/vaul.browser.test.ts` (`// Per …:9`). |
| `test/tests/nested.spec.ts` | **Out of scope for current lanes.** Nested drawer open/close is not yet re-authored; tracked as a surface gap, not counted as parity evidence. |
| `test/tests/non-dismissible.spec.ts` | **Out of scope for current lanes.** `dismissible={false}` overlay/drag refusal is not yet re-authored; tracked as a surface gap. |
| `test/tests/with-redirect.spec.ts` | **Out of scope.** Asserts body scroll-lock restore across a Next.js client navigation that this package does not host in adapted lanes (covered by the pristine Playwright lane). |
| `test/tests/with-scaled-background.spec.ts` | **Out of scope for current lanes.** Scaled-background CSS transform under drag is not yet re-authored. |
| `test/tests/without-scaled-background.spec.ts` | **Out of scope for current lanes.** Negative scaled-background assert is not yet re-authored. |
| `test/tests/helpers.ts`, `test/tests/constants.ts` | Support only; not executable cases. |

## Port-authored test classification

| File | Classification | Pairing |
| --- | --- | --- |
| `tests/upstream-original.test.ts` | unmodified-upstream-suite-wrapper | runs vendored Playwright suite against published `vaul@1.1.2` |
| `tests/drawer.test.ts` | adapted upstream | cites `upstream/test/tests/base.spec.ts` open/close cases |
| `tests/react-oracle.test.ts` | React/Octane differential | same open-drawer scenario against published `vaul@1.1.2` on React and `@octanejs/vaul`; also cites `base.spec.ts:10` |
| `tests/exports.test.ts` | package surface | root/`Drawer` export keys match pinned `vaul@1.1.2` |
| `tests/ssr/server.test.ts` | Octane-only framework contract | unpaired — upstream ships no SSR suite; closed trigger must render without browser globals. Runs in ordinary Vitest shards; not React-parity evidence. |
| `tests/browser/vaul.browser.test.ts` | adapted upstream (real browser) | cites base open/close, initial-snap load, and with-handle cycle; executes in the `vaul-real-browser` lane |
| `tests/browser-conformance/snap-drag.browser.test.ts` | Octane-only browser contract | unpaired snap-point mid-drag release stays open; `vaul-browser-conformance` project, not React-parity evidence |
| `tests/types/public-api.ts` | package conformance (types) | accept/reject matrix for public props; required adapted-types lane paired with `typetests/pristine` |

## Registered parity lanes

| Lane id | Kind | Project | Notes |
| --- | --- | --- | --- |
| `vaul-pristine-upstream` | pristine-upstream | `vaul-pristine` | vendored Playwright suite vs published React Vaul |
| `vaul-pristine-types` | pristine-types | `vaul-pristine-types` | repo-authored `tsc` probes against pinned React Vaul declarations |
| `vaul-adapted-types` | adapted-types | `vaul-types` | corresponding Octane `tsrx-tsc` accept/reject matrix |
| `vaul-adapted-full-suite` | adapted-octane | `vaul` | DOM / export / React-oracle inventory |
| `vaul-real-browser` | adapted-octane (real browser) | `vaul-browser` | headless Chromium inventory |

Upstream ships no type-test suite at `v1.1.2`, so the required pristine and
adapted type lanes use paired repo-authored declaration probes. The `vaul-ssr`
and `vaul-browser-conformance` Vitest projects stay outside parity ownership.
