# react-window upstream contract

## Immutable pin

| Field | Value |
| --- | --- |
| Package | `react-window` |
| Version | `2.3.0` |
| Repository | `https://github.com/bvaughn/react-window.git` |
| Annotated tag | `2.3.0` (`c8f17487…`) |
| Dereferenced tag commit | `4d9eebbb510262b3b7e95463cf49a10de53ea77d` |
| npm integrity | `sha512-FW6TIpaOH646k51X7yE+LSCWGkt5Pfsnc1fVyq/sCI9h0pTqmMiBXM04pzFKg3Bt7NGkeV6kqbU8d/QjmFS7Ug==` |
| npm shasum | `92fefee75b7de56a31204dfffc492b84136e4783` |
| npm tarball SHA-256 | `c62b0568794a8cf5f523fa6fd68f83261cfdc9bb7578e918ca2ae1181fc44623` |
| Canonical tag archive SHA-256 | `d0b66c0138c6355051a75086ce0681aa5880249c0d14f1e9759185daee16e452` |
| License | MIT, copyright Brian Vaughn |

The byte-exact tagged `lib/` tree, repository package metadata, and license are
vendored under `upstream/` for provenance and parity evidence. They are audit
inputs only and must remain excluded from the published package.

Run `pnpm --dir packages/react-window upstream:verify` to verify all 57 vendored
artifacts, the exact file set, the 14 upstream test artifacts and their 117 test
registrations, package metadata, and the complete root export inventory.

## Public v2.3.0 surface

Runtime exports: `Grid`, `List`, `getScrollbarSize`, `useDynamicRowHeight`,
`useGridCallbackRef`, `useGridRef`, `useListCallbackRef`, and `useListRef`.

Type exports: `Align`, `CellComponentProps`, `DynamicRowHeight`,
`GridImperativeAPI`, `GridProps`, `ListImperativeAPI`, `ListProps`, and
`RowComponentProps`.

The v1 `FixedSizeList`, `VariableSizeList`, `FixedSizeGrid`, and
`VariableSizeGrid` names are not part of this pin and are intentionally outside
the binding contract.
