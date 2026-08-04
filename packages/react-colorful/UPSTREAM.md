# Upstream provenance

`@octanejs/react-colorful` is an Octane adaptation of
[`react-colorful@5.8.0`](https://github.com/omgovich/react-colorful/tree/v5.8.0).

- npm version: `5.8.0`
- npm integrity: `sha512-Wy9OzPfjSN9bF12OB8N7UQvlsZ0I+7wHxpN+bV5BjNQGxOj6IiwkRjevJK9yOBjJWGQvAaf1OXtn8rUeEatAng==`
- npm shasum: `9bc89aac3e8c847b503489614e2d28227b36641f`
- repository tag: `v5.8.0`
- repository commit: `d914e7647c40a8bbdb286985176e769d76061732`
- license: MIT

The byte-preserved tag sources and tests live under `upstream/tag`; the
published declaration and package authorities live under `upstream/npm`.
Neither directory is included in the published package.

Framework-neutral color utilities are source-correspondent. React components,
hooks, JSX, synthetic event wrappers, and DOM prop types are adapted to Octane
components, hooks, `.tsrx`, native events, and Octane intrinsic prop types.
The public component callback named `onChange` remains unchanged; only the
internal text-input host wiring uses Octane's native `onInput`.
