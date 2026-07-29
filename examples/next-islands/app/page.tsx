import { CounterIsland } from './counter-island';
import { RechartsIsland } from './recharts-island';
import { TiptapIsland } from './tiptap-island';

export default function Home() {
	return (
		<main>
			<p className="ownership">Rendered by the Next.js React shell</p>
			<h1>Incremental Octane adoption</h1>
			<CounterIsland />
			<RechartsIsland />
			<TiptapIsland />
		</main>
	);
}
