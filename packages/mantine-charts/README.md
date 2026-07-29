# @octanejs/mantine-charts

Mantine’s Recharts-based chart components for Octane, ported from
`@mantine/charts@9.5.0`.

Import component styles once:

```ts
import '@octanejs/mantine-charts/styles.css';
```

The current release covers Mantine's Cartesian, polar, funnel, Sankey,
Sunburst, heatmap, list, tooltip, and legend surfaces. `ChartBrush` and
`Treemap` are intentionally not exported until their remaining stateful
Recharts internals are converted from React classes.
