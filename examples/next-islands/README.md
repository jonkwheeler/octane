# Next.js incremental island

This fixture keeps the App Router page and shell in React while three leaves
are mounted through `OctaneCompat`:

- a native TSRX counter;
- a React-style Recharts leaf converted to `@octanejs/recharts`;
- a React-style Tiptap leaf converted to `@octanejs/tiptap`, while retaining
  the framework-independent `@tiptap/starter-kit`.

```sh
pnpm --filter next-islands-example dev
pnpm --filter next-islands-example build
pnpm --filter next-islands-example build:turbopack
pnpm --filter next-islands-example test:e2e
```

The leading `/** @jsxImportSource octane */` pragma is the ownership boundary.
Unmarked `.tsx` continues through Next's React pipeline; marked `.tsx` and
`.tsrx` pass through the Octane loader. The binding packages publish raw
TypeScript and TSRX, so the Next configuration also transpiles and compiles
their package sources for hook-slot injection.

The migrated files are idempotent output from:

```sh
octane migrate analyze examples/next-islands/app/migrated-sales-chart.tsx
octane migrate convert examples/next-islands/app/migrated-sales-chart.tsx --apply
octane migrate analyze examples/next-islands/app/migrated-rich-text-editor.tsx
octane migrate convert examples/next-islands/app/migrated-rich-text-editor.tsx --apply
```

The consumer typecheck uses small declaration shims because the published
bindings currently expose implementation source instead of generated
declarations. Next's duplicate stock TypeScript pass remains disabled because
it does not understand the `.tsrx` module extension. Browser tests exercise
the published Recharts and Tiptap bindings against the workspace runtime and
compiler under both webpack and Turbopack.
