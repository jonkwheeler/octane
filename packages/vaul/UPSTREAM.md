# Upstream provenance

This binding targets `vaul@1.1.2` from
[`emilkowalski/vaul`](https://github.com/emilkowalski/vaul), tag `v1.1.2`, commit
`73d06cdd3fd990bf4b83214cfe240c246908af0d`.

The exact source, Playwright tests, package metadata, README, stylesheet, and
MIT license used for the port are retained under `upstream/`. The npm tarball
SHA-256 is `d062e21bae0c864c3559707c0451edabc0aac32a22eda239064a3faa7c9f1b21`.
Run `pnpm --dir packages/vaul upstream:check` to verify the vendored evidence.

## Source boundary

Upstream's React drawer implementation under `upstream/src` is re-authored in
`packages/vaul/src/index.tsrx` against `@octanejs/radix` Dialog primitives and
Octane hooks. The published stylesheet is reused as `src/style.css`.

## Test-suite disposition

Upstream ships a Playwright suite (`package.json` script `test`: `playwright test`)
whose specs live under `test/tests/`. Those specs are vendored at
`upstream/test/tests/`. The suite is not runnable as a pristine lane here: it
depends on the Next.js demo app, Playwright config, and page routes under
`test/` that are not present in the npm tarball and are not vendored in this
tree. A pristine-upstream lane is therefore not registered. Executable evidence
is the adapted Vitest / real-browser lanes in `audit/react-parity.json`.

| Upstream artifact | Disposition |
| --- | --- |
| `test/tests/base.spec.ts` | **Adapted (partial).** Open/close through trigger and `Drawer.Close`, plus controlled close: `tests/drawer.test.ts` (`// Per …:10`, `:27`, `:35`). Open-state semantic snapshot vs published React Vaul: `tests/react-oracle.test.ts` (`// Per …:10`). Browser lane covers open/close focus/styles/cleanup. Upstream drag-down close (`:49`) remains a gap; the unpaired snap-point mid-drag-stays-open contract lives in ordinary `vaul-browser-conformance`, not parity evidence. `defaultOpen` and context-menu-cancel drag remain gaps. |
| `test/tests/controlled.spec.ts` | **Adapted (partial).** Overlay dismiss with `open` + `onOpenChange` is covered by the controlled fixture path in `tests/drawer.test.ts` and browser close. Overlay non-dismiss when only `open` is passed remains a gap. |
| `test/tests/initial-snap.spec.ts` | **Adapted (partial).** Initially-open snap fixture asserts open + snap height on load: `tests/browser/vaul.browser.test.ts` (`// Per …:24`). Upstream's commented drag-snap cases stay unported. |
| `test/tests/with-handle.spec.ts` | **Adapted.** Handle click cycles snap points on the initially-open fixture: `tests/browser/vaul.browser.test.ts` (`// Per …:9`). |
| `test/tests/nested.spec.ts` | **Out of scope for current lanes.** Nested drawer open/close is not yet re-authored; tracked as a surface gap, not counted as parity evidence. |
| `test/tests/non-dismissible.spec.ts` | **Out of scope for current lanes.** `dismissible={false}` overlay/drag refusal is not yet re-authored; tracked as a surface gap. |
| `test/tests/with-redirect.spec.ts` | **Out of scope.** Asserts body scroll-lock restore across a Next.js client navigation that this package does not vendor or host. |
| `test/tests/with-scaled-background.spec.ts` | **Out of scope for current lanes.** Scaled-background CSS transform under drag is not yet re-authored. |
| `test/tests/without-scaled-background.spec.ts` | **Out of scope for current lanes.** Negative scaled-background assert is not yet re-authored. |
| `test/tests/helpers.ts`, `test/tests/constants.ts` | Support only; not executable cases. |

## Port-authored test classification

| File | Classification | Pairing |
| --- | --- | --- |
| `tests/drawer.test.ts` | adapted upstream | cites `upstream/test/tests/base.spec.ts` open/close cases |
| `tests/react-oracle.test.ts` | React/Octane differential | same open-drawer scenario against published `vaul@1.1.2` on React and `@octanejs/vaul`; also cites `base.spec.ts:10` |
| `tests/exports.test.ts` | package surface | root/`Drawer` export keys match pinned `vaul@1.1.2` |
| `tests/ssr/server.test.ts` | Octane-only framework contract | unpaired — upstream ships no SSR suite; closed trigger must render without browser globals. Runs in ordinary Vitest shards; not React-parity evidence. |
| `tests/browser/vaul.browser.test.ts` | adapted upstream (real browser) | cites base open/close, initial-snap load, and with-handle cycle; executes in the `vaul-real-browser` lane |
| `tests/browser-conformance/snap-drag.browser.test.ts` | Octane-only browser contract | unpaired snap-point mid-drag release stays open; `vaul-browser-conformance` project, not React-parity evidence |
| `tests/types/public-api.ts` | package conformance (types) | accept/reject matrix for public props; optional lane only — not required React-parity type evidence |

## Registered parity lanes

| Lane id | Kind | Project | Notes |
| --- | --- | --- | --- |
| `vaul-adapted-types` | adapted-types (optional) | `vaul-types` | package-conformance `tsrx-tsc` matrix; not a required parity oracle |
| `vaul-adapted-full-suite` | adapted-octane | `vaul` | DOM / export / React-oracle inventory |
| `vaul-real-browser` | adapted-octane (real browser) | `vaul-browser` | headless Chromium inventory |

No pristine-upstream or pristine-types lane is registered: the Playwright demo app
is absent from the vendored tree, and upstream ships no type-test suite at
`v1.1.2`. The `vaul-ssr` and `vaul-browser-conformance` Vitest projects stay
outside parity ownership.
