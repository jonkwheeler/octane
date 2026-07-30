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
	type WritableSignal,
} from '@octanejs/alien-signals';

const count: WritableSignal<number> = createSignal(1);
const doubled = createComputed(() => count() * 2);

count(2);
count((previous) => previous + 1);
createEffect(() => count());
createSignalScope(() => createEffect(() => count()));

const tuple: [number, (value: number | ((previous: number) => number)) => void] = useSignal(count);
const value: number = useSignalValue(doubled);
const setValue = useSetSignal(count);
setValue(3);
setValue((previous) => previous + 1);
useSignalEffect(() => () => {});
const stop: () => void = useSignalScope(() => createEffect(() => count()));
const computedValue: number = useComputed(() => count() * 3, []);

void tuple;
void value;
void stop;
void computedValue;

// @ts-expect-error computed signals are read-only
doubled(3);
// @ts-expect-error setters must match the signal value type
setValue('3');
