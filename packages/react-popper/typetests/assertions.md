# Type parity assertions

Pinned `react-popper@2.3.0` ships two typings programs under
`upstream/tag/typings/tests/`. The adapted counterparts under `typetests/` must
stay structurally one-for-one after the permitted transformations below.

| # | Transformation | Why |
| --- | --- | --- |
| 1 | formatting | TypeScript printer output must remain structurally identical |
| 2 | import-root | `../..` → `@octanejs/react-popper` |
| 3 | react-runtime-import | `import * as React from 'react'` / `React.useState` → `import { useState } from 'octane'` / `useState` |
| 4 | jsx-pragma | optional `/** @jsxImportSource octane */` (stripped before structural compare) |
| 5 | negative-control | matching `@ts-expect-error` controls must reject the same invalid shapes on both sides when present |

`typetests/public-api.test.ts` is adapted-only Octane public-surface evidence with
its own `@ts-expect-error` negative controls; it has no upstream twin and is not
part of the one-for-one structural pair.

Shared programs:

1. `main-test.tsx` — Manager/Reference/Popper children props and `usePopper` hook usage.
2. `svg-test.tsx` — Reference under SVG (`<g ref={ref} />`) plus Popper children props.
