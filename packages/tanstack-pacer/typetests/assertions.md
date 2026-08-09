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
- Files:
  - `compile.test-d.ts` — compile-accept for the Octane public surface
  - `setter-types.test-d.ts` — accept/reject evidence for `structural-state-setter-types`
- Inventory: `audit/adapted-types.json`

## Permitted transformations

1. Import roots: `@tanstack/react-pacer` → `@octanejs/tanstack-pacer`
2. React namespace setter types → local `Dispatch` / `SetStateAction` aliases from `src/internal.ts`
3. JSX import source: `react` → `octane` for adapted compile configuration

Any other structural change is drift.
