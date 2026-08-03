import { useState } from 'octane';
import { useBatcher, useDebouncedCallback, useThrottledCallback } from '@octanejs/tanstack-pacer';

export function PacerParity(props: { onPending?: () => void }) {
	const [debounced, setDebounced] = useState(0);
	const [throttled, setThrottled] = useState(0);
	const [batch, setBatch] = useState('');
	const onDebounced = useDebouncedCallback(() => setDebounced((value: number) => value + 1), {
		wait: 40,
	});
	const onThrottled = useThrottledCallback(() => setThrottled((value: number) => value + 1), {
		wait: 40,
	});
	const onPending = useDebouncedCallback(() => props.onPending?.(), { wait: 40 });
	const batcher = useBatcher((values: string[]) => setBatch(values.join(',')), {
		maxSize: 2,
		wait: 1000,
	});

	return <main>
		<button id="debounce" onClick={() => onDebounced()}>Debounce</button>
		<button id="throttle" onClick={() => onThrottled()}>Throttle</button>
		<button id="batch-a" onClick={() => batcher.addItem('a')}>Batch A</button>
		<button id="batch-b" onClick={() => batcher.addItem('b')}>Batch B</button>
		<button id="pending" onClick={() => onPending()}>Pending</button>
		<output id="debounced">{'debounced:' + debounced}</output>
		<output id="throttled">{'throttled:' + throttled}</output>
		<output id="batch">{'batch:' + batch}</output>
	</main>;
}
