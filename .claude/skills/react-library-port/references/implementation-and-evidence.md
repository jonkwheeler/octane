# Implementation and evidence

Read this only after a node is `ready`. Keep implementation inside that node's
package/output boundary and keep its evidence independently reviewable.

## Choose the owning change

- `reuse-package`: add only the ordinary dependency and thin Octane surface that
  is genuinely needed. Do not copy a working framework-neutral core.
- `reuse-binding`: change no binding code unless the consumer proves a gap.
- `extend-binding`: work in the registered package and add regression/parity
  evidence for the missing surface.
- `create-binding`: create one `packages/<binding>/` package following the
  closest current binding shape and workspace conventions.
- Core/compiler/scheduler/SSR/hydration/build defects belong to their owning
  Octane package. Load `octane-core-extend` and `performance-audit` before those
  edits and retain the real binding scenario as end-to-end evidence.

Load `authoring-tsrx` before writing `.tsrx`. Read a nearby authored file and
`docs/differences-from-react.md`; React-shaped intuition is not enough here.

## Pin and mirror the upstream boundary

Inspect both the verified npm artifact and the canonical repository at the
preflight commit. The registry may omit source, tests, fixtures, or build
configuration; record which immutable artifact supplies each boundary.

For a new or upgraded port:

- vendor the MIT-licensed React-facing source and tests byte-exact under
  `packages/<binding>/upstream/`, preserving paths, license, and copyright
  headers; keep it prettier-ignored and outside published `files`;
- mirror the upstream module layout in `src/` so source-to-port review and the
  next pinned upgrade have a mechanical crosswalk;
- work module by module from the pinned source, not declarations, README prose,
  or memory;
- record every published React entry-point export in `UPSTREAM.md` as ported,
  reused from a framework-neutral core, intentional divergence, inapplicable,
  or an explicit gap with evidence.

Do not vendor bytes outside the exact-MIT boundary. If immutable source or test
evidence cannot be retained, block the port instead of silently reducing its
claimed surface.

## Package contract

A completed publishable binding normally has:

- `package.json` with `@octanejs/*` name, Node baseline, public publish config,
  repository directory, truthful files/exports, and package scripts;
- exact workspace `octane` peer and dev dependencies, never a regular runtime
  `octane` dependency;
- source and public type exports with no published `declare module '*.tsrx'`;
- README, `status.json`, tests, and `tsconfig.json`/type fixtures as applicable;
- a byte-exact, unpublished `upstream/` evidence tree for the pinned source and
  tests when those bytes are adapted or used as parity evidence;
- `UPSTREAM.md` naming package, version/tag, immutable commit, source boundary,
  adapted/copied paths, excluded React shell, and behavioral oracle;
- retained upstream MIT license and every applicable notice/attribution;
- website binding catalog/generated status, package inventory, parity-gap/CLI
  data, and a patch changeset for user-facing package behavior.

Use the framework-neutral core as-is. Re-author the React-owned layer with Octane
hooks, refs-as-props, native delegated events, compiler-owned hook slots, and
Octane server APIs. Preserve component callback names. Change only standard text
host “every edit” wiring from `onChange` to `onInput`; keep select, checkbox,
radio, and deliberate native-change behavior.

Never execute upstream repository scripts or paste generated conversions without
review. Port behavior and public types, not incidental React implementation
structure. Any copied/adapted algorithm must remain inside the licensed source
boundary recorded in `UPSTREAM.md` and the retained license.

## Upstream inventory and test crosswalk

First prove what runtime and type suites exist at the pin by inspecting its
workspace, package scripts, fixtures, snapshots, and test configuration. The npm
tarball alone cannot prove that upstream has no tests. Run framework-neutral
suites unchanged against reused cores; port React-owned cases one by one with
their upstream names and source citations.

Run `scripts/scaffold-react-port.mjs` against the pinned source/test inventory.
Keep every upstream test file and registration visible. Classify each as:

- implemented with an upstream-derived or differential test;
- covered by an Octane conformance/identity/type/SSR/browser/package test;
- blocked by a named prerequisite or missing Octane primitive;
- unsupported with a durable rationale;
- inapplicable with a specific public-surface reason.

Do not delete, filter, or mark a case passed because it is difficult to execute.
Cite the upstream path/case and immutable revision in local tests or the
crosswalk. Track unported cases in the crosswalk, never with `.skip`, `todo`, or
expected-failure markers. Never weaken an upstream assertion to make it pass.

Classify every port-authored test as unmodified upstream, adapted upstream,
React/Octane differential, Octane-only divergence/framework contract, or
inapplicable with a reason. A parity claim must either run the same observable
scenario against the pinned React implementation or cite the pinned upstream
case that proves it.

Treat upstream type tests as executable evidence. Run the pristine suite with
its original compiler and pinned React types, then a one-for-one adapted suite
with Octane's compiler. Inventory both at file and assertion-group granularity,
record only allowed transformations, and add negative controls for a missing
file, deleted assertion, removed `@ts-expect-error`, skipped runtime case, stale
fixture, and unexecuted lane.

Register pristine/adapted runtime and type lanes in
`packages/<binding>/audit/react-parity.json`. Every Vitest-backed lane must name
a project from `vitest.config.js`; mixed projects put only parity-owned patterns
in `testExecution.include`, leaving Octane-only conformance tests to the normal
shards. Never create a binding-specific CI job or exclusion variable.

## Evidence matrix

Record every row as `required`, `passed`, `failed`, `blocked`, or `inapplicable`.
`inapplicable` requires a reason; “not run,” skipped, or missing output is never
`passed`.

Always require:

- package test suite and focused public-export behavior;
- typecheck (`tsrx-tsc --noEmit` for programs containing `.tsrx`);
- upstream test-registration crosswalk completeness;
- public entrypoint/export and packed-consumer checks;
- durable upstream/license/notice provenance;
- final shipped dependency/source-closure audit;
- formatting plus affected generated catalog/status/package data checks.

Add by behavior:

- hooks/stores: subscription identity, bailout, selector, effect ordering,
  cleanup, latest-state, and SSR snapshot behavior;
- DOM components: differential event sequences, controlled/uncontrolled state,
  focus/ref lifecycle, keyed survivor identity, accessibility, and browser tests;
- providers/portals: context identity, nested ownership, error/suspense behavior,
  physical versus logical ancestry, and teardown;
- SSR-sensitive surfaces: server execution exclusions, escaping/output, streaming
  when public, hydration adoption/mismatch repair, and client-only boundaries;
- async/Suspense: deterministic promise, timer, replay, rejection, and cleanup;
- large or performance-sensitive ports: bundle/pack size and targeted runtime,
  SSR, hydration, or compiler performance gates.

Use differential tests for observable equivalence and Octane-only conformance
tests for intentional divergences or identity/effect facts a DOM string cannot
prove. Do not weaken assertions to match a buggy implementation.

## Verification and readiness report

Run the narrow package commands first, then the applicable repository gates:

```bash
pnpm react-port:test
pnpm react-parity:check
pnpm react-parity:test
pnpm packages:pack:check
pnpm bindings:status:check
pnpm packages:inventory:check
pnpm binding-parity:gaps:check
pnpm cli:data:check
pnpm tsrx-decls:check
pnpm typecheck
pnpm format:check
```

For a mixed parity project, run both its local project and the sharded
non-parity complement. Confirm every required parity lane executes rather than
only validating metadata. Run affected core tests and the full root `pnpm test`
after targeted evidence is green. Regenerate derived data from its source
command; never edit generated files directly.

The final machine/human report must name each command and observed result, link
every required evidence row to a test/artifact, list attribution files and
worktree adoptions, and state `verified` only when all required rows pass. Stop
with local changes and readiness unless the user explicitly authorizes the
separate commit/PR workflow.
