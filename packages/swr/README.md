# @octanejs/swr

This directory is at the U1 architecture-gate stage for the exact Octane binding
of `swr@2.4.2`. Runtime implementation begins only after the provenance,
pristine-oracle, framework-seam, and packed-condition gates pass.

The source files currently expose deliberate U1 sentinels. They establish the
published module graph and must not be described as a usable SWR implementation.

## Devtools compatibility

The binding preserves array-valued `window.__SWR_DEVTOOLS_USE__` middleware in
its original order. It identifies its runtime through
`window.__SWR_DEVTOOLS_OCTANE__`; it deliberately does not create or claim
React's `window.__SWR_DEVTOOLS_REACT__`. Non-array ambient values, iterables,
proxies without an own data property, and accessor properties are ignored
without evaluating them. Accepted middleware is trusted executable consumer
code, as are fetchers, providers, subscribers, and retry callbacks.
