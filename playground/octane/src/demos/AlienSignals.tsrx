import { useState } from 'octane';
import {
	createComputed,
	createSignal,
	useSignal,
	useSignalEffect,
	useSignalValue,
} from '@octanejs/alien-signals';

const countSignal = createSignal(1);
const doubledSignal = createComputed(() => countSignal() * 2);

function EffectRegion() @{
	const count = useSignalValue(countSignal);
	useSignalEffect(() => {
		console.info(`[alien-signals] effect count=${countSignal()}`);
		return () => console.info('[alien-signals] effect cleanup');
	});

	<p id="alien-signals-effect">{'Effect region is observing ' + count}</p>
}

export function AlienSignalsDemo() @{
	const [count, setCount] = useSignal(countSignal);
	const doubled = useSignalValue(doubledSignal);
	const [showEffect, setShowEffect] = useState(true);

	<div>
		<h2 class="demo-title">{'Alien Signals on Octane'}</h2>
		<p
			class="demo-blurb"
		>{'Writable and computed Alien Signals drive Octane through concurrency-safe external-store subscriptions.'}</p>

		<div class="panel">
			<div class="row">
				<button id="alien-signals-decrement" class="btn" onClick={() => setCount(count - 1)}>
					−
				</button>
				<strong id="alien-signals-count">{'Count: ' + count}</strong>
				<strong id="alien-signals-doubled">{'Doubled: ' + doubled}</strong>
				<button
					id="alien-signals-increment"
					class="btn"
					onClick={() => setCount((value) => value + 1)}
				>
					+
				</button>
			</div>
			<button
				id="alien-signals-toggle-effect"
				class="btn"
				onClick={() => setShowEffect((value) => !value)}
			>
				{showEffect ? 'Unmount effect region' : 'Mount effect region'}
			</button>
			@if (showEffect) {
				<EffectRegion />
			}
		</div>
	</div>
}
