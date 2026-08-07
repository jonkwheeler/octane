# @octanejs/interior

Octane binding for [interior.dev](https://interior.dev) copy-paste React components — premium UI primitives ported to `.tsrx`.

## Usage

```tsx
// Scaffold — exports will land as the port progresses.
import {} from '@octanejs/interior';
```

## Compatibility

Components are vendored from interior.dev copy-paste sources; no npm upstream package.

## Known differences

None documented yet.

## Tests

Organized per the hook-form / react-parity contract:

- `tests/conformance/` — package-authored contract tests (ordinary CI shards)
- `tests/differential/` — Octane vs React oracle (dedicated project + `globalSetup`)
- Vitest projects declare `testExecution.group: 'react-parity'` on parity-owned lanes
