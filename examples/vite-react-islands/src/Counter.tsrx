import { useState } from 'octane';

export interface CounterProps {
	initialCount: number;
}

export function Counter({ initialCount }: CounterProps) @{
	const [count, setCount] = useState(initialCount);

	<section data-octane-island="counter">
		<p>Octane count: {count}</p>
		<button onClick={() => setCount((value) => value + 1)}>Increment</button>
	</section>
}
