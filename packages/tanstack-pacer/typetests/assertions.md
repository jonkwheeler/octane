# TanStack Pacer type-suite transformations

Upstream `test:types` is `tsc` over the React adapter package source. There are no
dedicated `.test-d.ts` assertion files at the pin.

## Pristine

- Compiler: `tsc`
- Project: `typetests/pristine/tsconfig.json`
- Includes the vendored `@tanstack/react-pacer@0.22.1` source under `upstream/package/src`
- Inventory: `audit/upstream-types.json` (per-file sha256; empty assertion groups)

## Adapted

- Compiler: `tsrx-tsc`
- Project: `typetests/adapted/tsconfig.json`
- Includes the complete Octane adapter source under `src/` plus
  `setter-types.test-d.ts` accept/reject evidence for `structural-state-setter-types`
- Inventory: `audit/adapted-types.json`

## Permitted transformations

1. Import roots: `@tanstack/react-pacer` / `react` → `@octanejs/tanstack-pacer` / `octane`
2. Extension: `provider/PacerProvider.tsx` → `provider/PacerProvider.tsrx`
3. React namespace setter types → local `Dispatch` / `SetStateAction` aliases from `src/internal.ts`
4. JSX import source: `react` → `octane`
5. Adapted-only modules: `src/internal.ts` and `src/provider/context.ts`

Any other structural change is drift. `scripts/react-parity/tanstack-pacer-types-lib.mjs`
compares file inventories under these maps and rejects a skipped adapted file, a deleted
probe assertion, or a removed `@ts-expect-error`.
