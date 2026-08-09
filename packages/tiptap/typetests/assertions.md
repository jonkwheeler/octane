# Type parity assertions

`@tiptap/react@3.28.0` ships no dedicated type-test suite for the adapter
surface this binding ports, so both sides of this lane are port-authored.
The two files assert the same public-surface claims: one against the published
upstream binding compiled with `tsc`, one against `@octanejs/tiptap` compiled
with `tsc`.

Permitted differences between the two files, and nothing else:

| # | Transformation | Why |
| --- | --- | --- |
| 1 | import root `@tiptap/react` → `@octanejs/tiptap` | the package under test |
| 2 | menus import `@tiptap/react/menus` → `@octanejs/tiptap/menus` | matching menus entry |
| 3 | `ReactNode` / `CSSProperties` → Octane host prop types | adapted side must not import React types |
| 4 | menu `className` → `class` | Octane class composition surface |

Every assertion group below appears in both files under the same heading.

1. `UseEditorOptions` accepts starter options.
2. `useEditor` returns a value assignable to `Editor | null`.
3. `useCurrentEditor().editor` is `Editor | null`.
4. `useEditorState` selector result is `string | null`.
5. `EditorContent` accepts props and is callable with those props.
6. `BubbleMenu` / `FloatingMenu` accept props and are callable with those props.
7. Unknown `UseEditorOptions` keys are rejected.

Octane-only declaration contracts (`useTiptap`, node/mark views, `ReactRenderer`,
rich menu event pins, and similar) stay in `typetests/public-api.test-d.ts` and
`typetests/menus-api.test-d.ts` outside this parity lane.
