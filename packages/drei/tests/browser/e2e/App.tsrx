import { Suspense } from 'octane';
import { Canvas } from '@octanejs/three';
import { Scene } from './App.three.tsrx';

export function App() @{
	<Canvas
		camera={{ position: [1, 1, 1] }}
		style={{ width: 300, height: 150, background: 'white' }}
	>
		<Suspense fallback={null}>
			<Scene />
		</Suspense>
	</Canvas>
}
