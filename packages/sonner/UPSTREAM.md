# Upstream provenance

This port targets the published `sonner@2.0.7` runtime and the matching
`v2.0.7` Git tag at commit `3ba7aa17ab7e8101b9cf4893936f873b0d4769b3`.

| Input | Location | Integrity |
| --- | --- | --- |
| npm tarball | `https://registry.npmjs.org/sonner/-/sonner-2.0.7.tgz` | SHA-256 `eb0f5dd35d890d38e8dcba1b242e9ac38cf45cc92c02aa914f144d98cfa7ce8f` |
| Git tag | `https://github.com/emilkowalski/sonner/tree/v2.0.7` | commit `3ba7aa17ab7e8101b9cf4893936f873b0d4769b3` |
| Vendored pin | `packages/sonner/upstream/` | same tag commit; source + Playwright suite |

The npm artifact contains the compiled runtime, declarations, styles, README,
package metadata, and MIT license. It does **not** contain the upstream test
suite. The Git tag does: `test/tests/basic.spec.ts` is an executable Playwright
suite backed by the Next.js app under `test/`. npm-tarball absence is therefore
not evidence that the repository has no tests; `upstreamSuites.runtime` is
`present`, and the suite is vendored at `packages/sonner/upstream/`.

The parity harness execution kinds are Vitest/Jest full-suite collectors. This
Playwright + Next.js e2e suite cannot register as a `vitest-full` /
`jest-full` pristine lane, so every upstream case below carries an explicit
disposition instead of a silent omission. Bounded required evidence remains:

- a same-fixture differential lane against published `sonner@2.0.7` on React;
- adapted Octane lanes for the three documented renderer-specific divergences.

When updating the pin, re-vendor `packages/sonner/upstream/` from the matching
Git tag, fetch and checksum the new npm artifact, refresh every manifest hash,
revisit each upstream-case disposition, and rerun every required lane plus the
global parity audit.

## Upstream runtime suite disposition

Source: `packages/sonner/upstream/test/tests/basic.spec.ts` (35 cases).

| Upstream case | Disposition |
| --- | --- |
| toast is rendered and disappears after the default timeout | **out of scope** — Playwright/Next e2e; covered by differential lifecycle |
| various toast types are rendered correctly | **out of scope** — Playwright/Next e2e; covered by differential + toaster contract |
| show correct toast content based on promise state | **out of scope** — Playwright/Next e2e; covered by toaster promise case |
| handle toast promise rejections | **out of scope** — Playwright/Next e2e; covered by state/promise Octane suites |
| promise toast with extended configuration | **out of scope** — Playwright/Next e2e; covered by toaster promise case |
| promise toast with extended error configuration | **out of scope** — Playwright/Next e2e; action preventDefault covered by adapted native-event case |
| promise toast with Error object rejection | **out of scope** — Playwright/Next e2e; covered by state/promise Octane suites |
| render custom jsx in toast | **out of scope** — Playwright/Next e2e; covered by adapted custom-element path |
| toast is removed after swiping down | **out of scope** — Playwright/Next e2e; covered by toaster swipe case |
| dismissible toast is not removed when dragged | **out of scope** — Playwright/Next e2e; pointer harness gap in jsdom |
| toast is removed after swiping up | **out of scope** — Playwright/Next e2e; covered by toaster swipe case |
| toast is not removed when hovered | **out of scope** — Playwright/Next e2e; hover timing is browser-only |
| toast is not removed if duration is set to infinity | **out of scope** — Playwright/Next e2e; covered by toaster duration/infinity cases |
| toast is not removed when event prevented in action | **adapted evidence** — `adapted:sonner-native-action-events` |
| toast's auto close callback gets executed correctly | **out of scope** — Playwright/Next e2e; covered by toaster onAutoClose case |
| toast's dismiss callback gets executed correctly | **out of scope** — Playwright/Next e2e; covered by toaster dismiss paths |
| toaster's theme should be light | **out of scope** — Playwright/Next e2e; covered by toaster theme/data-attribute contract |
| toaster's theme should be dark | **out of scope** — Playwright/Next e2e; covered by toaster theme/data-attribute contract |
| toaster's theme should be changed | **out of scope** — Playwright/Next e2e; system-theme listener covered by toaster suite |
| return focus to the previous focused element | **out of scope** — Playwright/Next e2e; covered by toaster hotkey/focus case |
| toaster's dir prop is reflected correctly | **out of scope** — Playwright/Next e2e; dir attribute not yet mirrored as a dedicated Octane case |
| toaster respects the HTML's dir attribute | **out of scope** — Playwright/Next e2e; dir inheritance not yet mirrored as a dedicated Octane case |
| toaster respects its own dir attribute over HTML's | **out of scope** — Playwright/Next e2e; dir precedence not yet mirrored as a dedicated Octane case |
| show correct toast content when updating | **out of scope** — Playwright/Next e2e; covered by differential + toaster update case |
| should update toast content and duration after 3 seconds | **out of scope** — Playwright/Next e2e; timed update path not yet mirrored |
| cancel button is rendered with custom styles | **out of scope** — Playwright/Next e2e; cancel control covered by adapted native-event case |
| action button is rendered with custom styles | **out of scope** — Playwright/Next e2e; action control covered by adapted native-event case |
| string description is rendered | **out of scope** — Playwright/Next e2e; covered by toaster contract |
| ReactNode description is rendered | **out of scope** — Playwright/Next e2e; custom content covered by adapted path |
| aria labels are custom | **out of scope** — Playwright/Next e2e; covered by toaster accessibility contract |
| toast with toasterId only appears in the correct Toaster | **out of scope** — Playwright/Next e2e; covered by toaster routing case |
| toast without toasterId only appears in the global Toaster | **out of scope** — Playwright/Next e2e; covered by toaster routing case |
| toast with testId renders data-testid attribute correctly | **out of scope** — Playwright/Next e2e; covered by toaster contract |
| toast without testId does not have data-testid attribute | **out of scope** — Playwright/Next e2e; negative testId path not yet mirrored |
| promise toast with testId maintains testId through state changes | **out of scope** — Playwright/Next e2e; covered by toaster promise + testId paths |

Support/config under `packages/sonner/upstream/test/` (Next app, Playwright
config, package metadata) is vendored as the suite harness, not as additional
case inventory. Upstream ships **no type tests** at this pin.
