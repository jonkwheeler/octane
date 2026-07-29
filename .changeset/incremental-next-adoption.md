---
'@octanejs/cli': patch
'@octanejs/mobx': patch
'@octanejs/rspack-plugin': patch
---

Add the first incremental React adoption workflow.

`octane migrate analyze` now builds a cycle-safe local import closure and
reports source blockers, React-bound dependencies, framework-independent
candidates, and catalog-backed Octane replacements through stable human and
JSON output.

The standalone Octane loader is now explicitly webpack-compatible without
requiring Rspack as a peer. A pinned Next.js App Router fixture verifies a
stateful TSRX island plus converted Recharts and Tiptap leaves through webpack,
Turbopack, static prerendering, and browser interactions. Migration analysis
now resolves package manifests from nested workspace leaves, so dependencies
installed beside the migrated file are classified correctly.

Add `@octanejs/mobx`, an Octane-native port of the `mobx-react-lite`
function-component surface backed by the unchanged MobX core.
