import { useState } from 'octane';
import {
	createEffect,
	type ReadableSignal,
	type WritableSignal,
	useComputed,
	useSetSignal,
	useSignal,
	useSignalEffect,
	useSignalScope,
	useSignalValue,
} from '@octanejs/alien-signals';

export function SignalReaders(props: {
	left: WritableSignal<number>;
	right: ReadableSignal<number>;
}) @{
	const [left, setLeft] = useSignal(props.left);
	const right = useSignalValue(props.right);
	const setLeftOnly = useSetSignal(props.left);

	<div>
		<p id="values">{left + '/' + right}</p>
		<button id="increment" onClick={() => setLeft((value) => value + 1)}>increment</button>
		<button id="set" onClick={() => setLeftOnly(10)}>set</button>
	</div>
}

export function SwitchingReader(props: {
	first: WritableSignal<number>;
	second: WritableSignal<number>;
}) @{
	const [second, setSecond] = useState(false);
	const value = useSignalValue(second ? props.second : props.first);

	<div>
		<p id="switch-value">{value as string}</p>
		<button id="switch" onClick={() => setSecond(true)}>switch</button>
	</div>
}

export function ComputedReader(props: {
	source: WritableSignal<number>;
	multiplier: number;
}) @{
	const value = useComputed(() => props.source() * props.multiplier, [props.multiplier]);
	<p id="computed">{value as string}</p>
}

export function SetterProbe(props: {
	source: WritableSignal<number>;
	record: (setter: (value: number | ((previous: number) => number)) => void) => void;
}) @{
	const [, setValue] = useSignal(props.source);
	const [, setRender] = useState(0);
	props.record(setValue);

	<button id="rerender" onClick={() => setRender((value) => value + 1)}>rerender</button>
}

export function ScopeProbe(props: {
	source: WritableSignal<number>;
	label: string;
	log: (entry: string) => void;
	onStop: (stop: () => void) => void;
}) @{
	const stop = useSignalScope(() => {
		createEffect(() => props.log(props.label + ':' + props.source()));
	});
	props.onStop(stop);

	<p id="scope-probe">{props.label}</p>
}

export function LifecycleEffects(props: {
	source: WritableSignal<number>;
	log: (entry: string) => void;
	onStop: (stop: () => void) => void;
}) @{
	useSignalEffect(() => {
		props.log('effect:' + props.source());
		return () => props.log('cleanup');
	});

	const stop = useSignalScope(() => {
		createEffect(() => props.log('scope-a:' + props.source()));
		createEffect(() => props.log('scope-b:' + props.source()));
	});
	props.onStop(stop);

	<p id="lifecycle">ready</p>
}

export function ServerSignalView(props: {
	source: WritableSignal<number>;
	log: (entry: string) => void;
}) @{
	const value = useSignalValue(props.source);
	useSignalEffect(() => props.log('effect'));
	useSignalScope(() => props.log('scope'));
	<p id="server-signal">{value as string}</p>
}
