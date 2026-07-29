# React Router islands

This example keeps React Router, route matching, navigation, and route modules
in React. The `/counter` route mounts one compiled Octane TSRX leaf through
`OctaneCompat`.

```bash
pnpm --filter react-router-islands-example build
pnpm --filter react-router-islands-example dev
```

Both Vite plugins run together. Route modules stay `.tsx`; converted leaves use
`.tsrx`. Loaders, actions, error boundaries, providers, and navigation remain
React-owned.
