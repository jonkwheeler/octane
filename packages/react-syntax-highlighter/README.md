# `@octanejs/react-syntax-highlighter`

The Octane binding for `react-syntax-highlighter@16.1.1`. It preserves the
default, Light, Prism, async, language, style, renderer, and deep-import
surfaces without adding React to the runtime graph.

```tsrx
import { Prism } from '@octanejs/react-syntax-highlighter';
import vscDarkPlus from '@octanejs/react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus';

export function CodeSample() @{
	<Prism language="typescript" style={vscDarkPlus} showLineNumbers>
		{'const answer: number = 42;'}
	</Prism>
}
```

Existing imports can be rewritten package-for-package:

```diff
- import SyntaxHighlighter from 'react-syntax-highlighter';
- import javascript from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
+ import SyntaxHighlighter from '@octanejs/react-syntax-highlighter';
+ import javascript from '@octanejs/react-syntax-highlighter/dist/esm/languages/hljs/javascript';
```

The complete generated export map includes extensionless and `.js` ESM/CJS
paths for the pinned release. `PreTag` and `CodeTag` accept native tag names or
Octane function components. React class components need a function adapter;
that framework-identity boundary is the sole recorded divergence.

See [`UPSTREAM.md`](UPSTREAM.md) for immutable provenance. The fail-closed
parity audit runs all 19 upstream suites and 51 test identities, 40 snapshots,
paired type contracts, SSR/hydration, a React differential, and real Chromium
and Firefox rendering.
