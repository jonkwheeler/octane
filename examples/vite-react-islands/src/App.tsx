import { OctaneCompat } from 'octane/react';
import { Counter } from './Counter.tsrx';

export function App() {
	return (
		<main>
			<h1>React shell</h1>
			<OctaneCompat component={Counter} props={{ initialCount: 2 }} />
		</main>
	);
}
