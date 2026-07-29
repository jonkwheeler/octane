import {
	useBoolean,
	useCounter,
	useDebounceCallback,
	useInterval,
	useIsMounted,
	useMap,
	useStep,
	useTimeout,
	useToggle,
	useUnmount,
} from '@octanejs/usehooks-ts';

export function StateProbe() @{
	const first = useBoolean();
	const second = useBoolean(true);
	const counter = useCounter(2);
	const [toggle, flip] = useToggle();
	const [map, actions] = useMap([['a', 1]]);
	const [step, stepActions] = useStep(2);
	<div>
		<span id="state">{`${first.value}/${second.value}/${counter.count}/${toggle}/${
			map.get('a') ?? '-'
		}/${step}`}</span>
		<button id="first" onClick={first.toggle}>first</button>
		<button id="second" onClick={second.toggle}>second</button>
		<button id="increment" onClick={counter.increment}>increment</button>
		<button id="reset" onClick={counter.reset}>reset</button>
		<button id="toggle" onClick={flip}>toggle</button>
		<button id="map" onClick={() => actions.set('a', 2)}>map</button>
		<button id="remove" onClick={() => actions.remove('a')}>remove</button>
		<button id="next" onClick={stepActions.goToNextStep}>next</button>
	</div>
}

export function TimingProbe(props: {
	onDebounce(): void;
	onInterval(): void;
	onTimeout(): void;
	onUnmount(): void;
}) @{
	const debounced = useDebounceCallback(props.onDebounce, 50);
	useInterval(props.onInterval, 20);
	useTimeout(props.onTimeout, 30);
	useUnmount(props.onUnmount);
	const mounted = useIsMounted();
	<button id="debounce" data-mounted={mounted() ? 'yes' : 'no'} onClick={debounced}>
		debounce
	</button>
}

export function SsrProbe() @{
	const mounted = useIsMounted();
	useInterval(() => {}, null);
	useTimeout(() => {}, null);
	<p>
		{mounted() ? 'mounted' : 'server'}
	</p>
}
