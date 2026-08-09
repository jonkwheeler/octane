/**
 * Adapted counterpart of the upstream typecheck assertion in
 * `upstream/src/index.test.ts` (Per src/index.test.ts:392).
 *
 * Upstream's bun:test Matchers (with jest-dom augmentation) type
 * `expect(value).toBe(...)` so `undefined` is rejected when the actual type
 * includes `undefined`. Reproduce that matcher shape here so the adapted lane
 * keeps the same `@ts-expect-error` assertion group after the permitted
 * harness transforms.
 */

type BunMatchers<T> = {
	toBe(expected: Exclude<T, undefined>): void;
};

declare function expect<T>(actual: T): BunMatchers<T>;

declare const result: {
	current: [number | undefined | null, (value: number | undefined | null) => void];
};

// @ts-expect-error
expect(result.current[0]).toBe(undefined);
