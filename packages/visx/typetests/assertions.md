# Visx ReactNode → OctaneNode type probes

Upstream Visx types child and render-prop returns as `React.ReactNode`. The
Octane port uses `OctaneNode` (`unknown`) because Octane elements are nominal
and would be rejected by `ReactNode`.

These two files assert the accept/reject difference for the same Pie surface:

| Side | Compiler | Package under test | Expected |
| --- | --- | --- | --- |
| pristine | `tsc` | `@visx/visx` `Shape.Pie` | `unknown` renderables are rejected |
| adapted | `tsrx-tsc` | `@octanejs/visx` `PieProps` | `unknown` renderables are accepted |

Shared assertion groups:

1. Pie `children` render-prop return rejects/accepts an Octane renderable.
2. Pie `centroid` return rejects/accepts an Octane renderable.
