/**
 * Adapted counterpart of the upstream typecheck program
 * (`upstream/src/index.test.ts` under `upstream/tsconfig.json`).
 *
 * Pins both:
 * - the single `@ts-expect-error` assertion group at upstream line 392
 * - every accepted public-API call shape from the 26 hook/core scenarios
 *
 * Scenario helpers keep local bindings (matching upstream per-case scopes) so
 * the mechanical accepted-call inventory can stay one-for-one without forcing
 * conflicting top-level types.
 */

import {
	createComputed,
	createEffect,
	createSignal,
	createSignalScope,
	useComputed,
	useSetSignal,
	useSignal,
	useSignalEffect,
	useSignalScope,
	useSignalValue,
} from '@octanejs/alien-signals';

type BunMatchers<T> = {
	toBe(expected: Exclude<T, undefined>): void;
};

declare function expect<T>(actual: T): BunMatchers<T>;

function writableAndComputed() {
	createSignal(0);
	const countSignal = createSignal(1);
	createComputed(() => countSignal() * 2);
}

function effectsAndScopes() {
	const countSignal = createSignal(0);
	let effectRuns = 0;
	let value = 0;
	createEffect(() => {
		countSignal();
		effectRuns++;
	});
	createEffect(() => {
		value = 99;
	});
	createSignalScope(() => {
		createEffect(() => {
			countSignal();
			effectRuns++;
		});
	});
	createSignalScope(() => {
		createEffect(() => {
			value = 99;
		});
	});
}

function nestedAndEffectWrites() {
	const outerSignal = createSignal(1);
	const innerSignal = createSignal(2);
	createComputed(() => outerSignal() * innerSignal());
	const countSignal = createSignal(0);
	const doubleSignal = createSignal(0);
	createEffect(() => {
		doubleSignal(countSignal() * 2);
	});
	let observed = 0;
	createEffect(() => {
		observed = countSignal();
	});
}

function hookReaders() {
	const countSignal = createSignal(0);
	useSignal(countSignal);
	useSignalValue(countSignal);
	useSetSignal(countSignal);
	const effectFn = function effect() {};
	useSignalEffect(effectFn);
	useSignalScope(() => {});
	useComputed(() => countSignal() * 2, []);
}

function computedVariants() {
	const countSignal = createSignal(0);
	const multiplierSignal = createSignal(2);
	useComputed(() => countSignal() * multiplierSignal(), []);
	const a = createSignal(1);
	const b = createSignal(2);
	const computedA = createComputed(() => a() + 1);
	const computedB = createComputed(() => b() + 1);
	useComputed(() => computedA() + computedB(), []);
	const sig = createSignal(1);
	let getterCalls = 0;
	useComputed(() => {
		getterCalls++;
		return sig() * 2;
	}, []);
	let offset = 0;
	useComputed(() => {
		getterCalls++;
		return sig() + offset;
	}, [offset]);
}

function objectSignalUpdate() {
	const signal = createSignal({ a: 1, b: 2 });
	useSignal(signal);
}

function cleanupSubscriptions() {
	const signal = createSignal(0);
	const effectFn = function effect() {};
	useSignal(signal);
	useComputed(() => signal() * 2, []);
	useSignalEffect(() => {
		signal();
		effectFn();
	});
}

function numericEffectHook() {
	const countSignal = createSignal(0);
	const cleanupFn = function cleanup() {};
	useSignalEffect(() => {
		countSignal();
		return cleanupFn;
	});
	createSignal(2);
	useComputed(() => ({ count: countSignal() }), []);
}

writableAndComputed();
effectsAndScopes();
nestedAndEffectWrites();
hookReaders();
computedVariants();
objectSignalUpdate();
cleanupSubscriptions();
numericEffectHook();

// Bare creates that appear as accepted calls in upstream scenarios.
createSignal(0);
createSignal(1);
createSignal(2);
createSignal({ a: 1, b: 2 });
createSignal<number | undefined | null>(123);

function undefinedNullSignalValues() {
	const signal = createSignal<number | undefined | null>(123);
	const result = {
		current: useSignal(signal),
	};

	// @ts-expect-error
	expect(result.current[0]).toBe(undefined);
}

undefinedNullSignalValues();
