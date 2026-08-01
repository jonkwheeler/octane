# Vite React islands

This example keeps React as the application owner and mounts one compiled
Octane TSRX leaf through `OctaneCompat`.

```bash
pnpm --filter vite-react-islands-example build
pnpm --filter vite-react-islands-example dev
```

Both Vite plugins run together: React compiles the existing `.tsx` shell and
the Octane plugin compiles `.tsrx` leaves. No React aliasing is used.
