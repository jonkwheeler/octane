# Allowed transforms: adapted browser suite

The adapted suite is a one-for-one port of
`packages/waypoint/upstream/test/browser/waypoint_test.jsx`. Structural
fidelity is gated by `scripts/react-parity/waypoint-browser-suite-lib.mjs`
(titles, ordered `expect(...)` matcher fingerprints, and critical fixture
markers). Only the transforms below may change those fingerprints.

SHA256 of `harness/waypoint_adapted_suite.jsx` is locked in
`packages/waypoint/audit/adapted-browser-suite.json`. After an intentional
suite edit, refresh citations and the lock:

```bash
node scripts/react-parity/waypoint-browser-cite.mjs --refresh-lock
```

## Global (non-fingerprint) adaptations

- Import the Octane React shim (`./octane-react-shim.js`) and `@octanejs/waypoint`.
- File-level and case-level `// Per …` provenance citations.
- `// OCTANE DIVERGENCE: …` comments explaining intentional behavior changes.
- Tabs / Prettier formatting; named functions where the adapted harness prefers them.
- Class child components rewritten as function components with `ref` as a prop
  (`innerRef={…}`) — Octane has no `forwardRef` / class component surface.
- Horizontal window scroll parent: set `parentStyle.display = 'inline-block'` so
  layout matches the adapted harness viewport.

## Per-case expect matcher transforms

| it() title | upstream expects | adapted expects | reason |
| --- | --- | --- | --- |
| errors when a Stateful Component does not provide ref to Waypoint | `.toThrowError` | `.not.toThrow` | Octane refs-as-props; missing child ref does not throw `ensureRefIsUsedByChild`. |
| errors when a Stateless Component does not provide ref to Waypoint | `.toThrowError` | `.not.toThrow` | Same ref-contract divergence. |

## Per-case fixture marker transforms

| it() title | upstream fixtures | adapted fixtures | reason |
| --- | --- | --- | --- |
| only calls onEnter once | `forceUpdate` | `useState` | No class `forceUpdate`; `Wrapper` bumps `useState` from onEnter and still asserts a single fire. |
