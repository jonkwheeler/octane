/** @jsxImportSource octane */
import { useState } from 'octane';

export interface CounterProps {
	initialCount: number;
}

export function Counter(props: CounterProps) @{
	const [count, setCount] = useState(props.initialCount);
	<section class="island" data-owner="octane">
		<p>{'Rendered by an Octane TSRX island: ' + count}</p>
		<button onClick={() => setCount(count + 1)}>Increment</button>
	</section>
}
