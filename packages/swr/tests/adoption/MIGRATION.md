# Frozen SWR adoption corpus

U1 freezes `consumer.tsrx` as the ordinary migration target. It is deliberately
not executed against the architecture sentinels. The parity units must make this
same source executable without changing its SWR concepts.

| Existing import | Octane binding import |
| --- | --- |
| `swr` | `@octanejs/swr` |
| `swr/infinite` | `@octanejs/swr/infinite` |
| `swr/immutable` | `@octanejs/swr/immutable` |
| `swr/subscription` | `@octanejs/swr/subscription` |
| `swr/mutation` | `@octanejs/swr/mutation` |

The expected migration is the package-name replacement above. Keys, fetchers,
configuration, returned state, cache mutation, preload, pagination, mutation,
and subscription call shapes remain parity requirements. Framework rendering
syntax follows Octane's normal TSX transform; no SWR-specific adapter component
or application rewrite is allowed.
