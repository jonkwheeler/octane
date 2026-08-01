import { useState } from 'octane';

export function Counter({ initialCount }: { initialCount: number }) @{
	const [count, setCount] = useState(initialCount);
	<section data-octane-island="start-counter">
		<p>Octane count: {count}</p>
		<button onClick={() => setCount((value) => value + 1)}>Increment</button>
	</section>
}
