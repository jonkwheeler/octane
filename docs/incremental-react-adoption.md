# Incremental React adoption

Octane can own a compiled leaf inside an existing React 19 application. The
React framework, routes, layouts, and surrounding component tree stay in place;
the selected leaf mounts through `OctaneCompat` from `octane/react`.

This workflow is intentionally narrower than translating a React application or
running third-party React components unchanged.

## 1. Analyze a leaf

Install the CLI and run the read-only preflight from the application root:

```bash
pnpm add -D @octanejs/cli
pnpm exec octane migrate analyze src/components/PriceBadge.tsx
pnpm exec octane migrate analyze src/components/PriceBadge.tsx --json
```

The analyzer follows local static imports and reports:

- `supported`: Octane itself or a package in the generated binding catalog;
- `candidate`: no React evidence was found, but build and behavior review are
  still required;
- `blocked`: a React-bound or unresolved dependency has no proven replacement.

It also blocks class components, provider ownership boundaries, server-only
imports, framework route/layout files, computed imports, and unsupported React
APIs. A blocked report exits with code `3`; malformed invocation exits with
code `2`, and command failures use code `1`.

For example, `mobx-react-lite` maps to `@octanejs/mobx`. `@mantine/core`,
`@mantine/hooks`, `@mantine/form`, and Mantine's extension packages remain
blocked because no Mantine binding exists. A supported Recharts or Tiptap
dependency inside that graph does not make the parent Mantine component
portable.

## 2. Preview the conversion

Conversion is a dry run unless `--apply` is present:

```bash
pnpm exec octane migrate convert src/components/PriceBadge.tsx
pnpm exec octane migrate convert src/components/PriceBadge.tsx --apply
```

The converter keeps TSX, adds the Octane JSX ownership pragma, rewrites only
catalog-proven package imports, and changes standard text-entry edit handlers
from React's synthetic `onChange` convention to native `onInput`. Select,
non-text input types, dynamically typed inputs, and public component callbacks
keep `onChange`.

Each write is guarded by the digest read during analysis. If the file differs
when apply checks it, it is reported as a conflict and is not overwritten.
Running conversion again is idempotent.

## 3. Add the Next.js build boundary

Install the compiler loader and configure both supported Next.js paths:

```bash
pnpm add octane @octanejs/rspack-plugin
```

```js
// next.config.mjs
const octaneRule = {
  loaders: [
    {
      loader: '@octanejs/rspack-plugin/loader',
      options: { environment: 'client', requireDirective: true },
    },
  ],
  as: '*.tsx',
};

export default {
  turbopack: {
    rules: { '*.tsrx': octaneRule },
    resolveExtensions: ['.tsrx', '.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
  },
  webpack(config) {
    config.resolve.extensions.unshift('.tsrx');
    config.module.rules.push({
      test: /\.tsrx$/,
      enforce: 'pre',
      use: octaneRule.loaders[0],
    });
    return config;
  },
};
```

Next's stock TypeScript pass does not parse `.tsrx`; run `tsrx-tsc` before the
Next build and disable only Next's duplicate typecheck. The committed
[`next-islands` example](../examples/next-islands/README.md) is the executable
reference and pins the tested Next and React versions.

## 4. Mount the island

Keep the App Router boundary as a React Client Component. Import the compiled
Octane leaf and render it below `OctaneCompat`:

```tsx
'use client';

import { OctaneCompat } from 'octane/react';
import { PriceBadge } from './PriceBadge.tsrx';

export function PriceBadgeIsland({ cents }: { cents: number }) {
  return <OctaneCompat component={PriceBadge} props={{ cents }} />;
}
```

Choose a meaningful leaf rather than thousands of tiny islands. Verify both
webpack and Turbopack production builds, server markup, hydration, client
updates, navigation, event bubbling, and teardown.

## Stop conditions

Do not apply conversion when the report is blocked or when the candidate owns a
route/layout, Server Component, provider boundary, class component, or
unresolved dynamic import. Do not alias `react` to `octane`, convert
dependencies in `node_modules`, or assume a framework-independent candidate is
compatible without a build and behavior check.

Selective hosted event delegation and advanced external-portal behavior remain
deferred. The current hosted-runtime envelope is tracked in
[`react-hosted-octane-compat-plan.md`](./react-hosted-octane-compat-plan.md).
