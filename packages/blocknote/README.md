# @octanejs/blocknote

Octane binding for [`@blocknote/react`](https://www.npmjs.com/package/@blocknote/react) — block-based rich text editors.

## Usage

```tsx
// Scaffold — exports will land as the port progresses.
import {} from '@octanejs/blocknote';
```

## Compatibility

Pinned to `@blocknote/react@0.53.0`. Reuses `@blocknote/core` unchanged; React binding reimplemented on Octane with `@octanejs/tiptap` at the editor boundary.

### Milestone 1 exports

- `useCreateBlockNote`
- `BlockNoteView`
- `useBlockNoteEditor`
- `BlockNoteContext` / `useBlockNoteContext`

### Mechanical port

```bash
pnpm port-upstream   # from packages/blocknote — copies upstream src with transforms
```

Review files flagged `CHECKPOINT` in `scripts/port-upstream.mjs` before shipping milestone 1.

## Known differences

None documented yet.

## Tests

M1 ships Octane-only evidence — not a react-parity claim:

- `tests/conformance/` — package export contract tests
- `tests/unit/` — Octane port regressions

A React differential lane (dedicated vitest project, `globalSetup`, fixtures, and `packages/blocknote/audit/react-parity.json`) is deferred until there is real comparison evidence to run.
