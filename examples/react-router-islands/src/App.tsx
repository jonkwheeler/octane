import { OctaneCompat } from 'octane/react';
import { Link, Route, Routes } from 'react-router';
import { Counter } from './Counter.tsrx';

export function App() {
	return (
		<main>
			<h1>React Router shell</h1>
			<nav>
				<Link to="/">Home</Link> <Link to="/counter">Counter</Link>
			</nav>
			<Routes>
				<Route path="/" element={<p>React owns this route.</p>} />
				<Route
					path="/counter"
					element={<OctaneCompat component={Counter} props={{ initialCount: 2 }} />}
				/>
			</Routes>
		</main>
	);
}
