# Upstream

- Repository: https://github.com/vercel/streamdown
- Commit: `e5deed330aa4231751a106445d93d62e4716a22f`
- Core package: `streamdown@2.5.0`
- Plugin packages:
  - `@streamdown/code@1.1.1`
  - `@streamdown/math@1.0.2`
  - `@streamdown/mermaid@1.0.2`
  - `@streamdown/cjk@1.0.3`
- License: Apache-2.0
- Core npm tarball SHA-256: `8dc9e1f04cda91beab7818cc11fd5cee8c5f316b84934686c892c8cfb9b808ac`

The framework-neutral Markdown, HAST, remark/rehype, code-highlighting,
Mermaid, math, and CJK logic is retained from upstream. React-owned component,
hook, portal, element, and JSX-runtime boundaries are ported to Octane.

The published npm artifacts do not include the upstream test suite, so this
repository does not claim pristine-upstream test execution. The required
differential lane instead executes eight exact same-fixture scenarios against
the pinned published React packages. A separate adapted lane authenticates the
native-event and consolidated-plugin-package divergences. Every other local
test is classified as an Octane framework contract.
