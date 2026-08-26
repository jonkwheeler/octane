# Upstream provenance

- Repository: https://github.com/floating-ui/floating-ui
- Release: `@floating-ui/react@0.27.19`
- Commit: `d8020ee98c702caa31fa9b4d929ca782c6b58c59`
- Source root: `packages/react/src`
- Test root: `packages/react/test`
- License: MIT
- Archive SHA-256: `55480b7a99c1bffdc662c4b67492503bd7d7705b82c43e1fcb522e71a07e695b`

`audit/upstream.lock.json` pins the npm integrity, repository commit, license,
every retained upstream byte, and every deterministic adaptation. Regenerate and
verify it with:

```bash
pnpm --filter @octanejs/floating-ui upstream:check
pnpm --filter @octanejs/floating-ui parity:inventory
```

The pristine lane runs the upstream package's full Vitest unit suite unchanged
under its release-era React 18, Vitest 3, Vite 6, and jsdom 26 stack. The adapted
lane runs the one-for-one generated Octane suite under the same runner stack.
Each side executes 286 passing assertions and retains the same 6 upstream skips;
the runtime crosswalk permits no omissions. The paired upstream type program is
also compiled with `tsc` and `tsrx-tsc` respectively.

The repository-authored differential lane remains a focused hook-isolation
oracle. Real Chromium layout and `autoUpdate` coverage lives in the ordinary
`floating-ui-browser` project (heavy-integration browser lane), not in the React
parity manifest.
