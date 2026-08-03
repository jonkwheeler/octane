import { createRoot, useRef, useState } from 'octane';
import Draggable from '@octanejs/react-draggable';

function FrameFixture() @{
	const ref = useRef<HTMLDivElement | null>(null);
	const [trace, setTrace] = useState('idle');
	<>
		<Draggable
			nodeRef={ref}
			onDrag={(_event, data) => setTrace(`drag:${data.x},${data.y}`)}
			onStop={(_event, data) => setTrace(`stop:${data.x},${data.y}`)}
		>
			<div ref={ref} id="frame-drag" style={{ width: '20px', height: '20px' }}>drag</div>
		</Draggable>
		<output id="frame-trace">{trace}</output>
	</>
}

createRoot(document.querySelector('#frame-app')!).render(FrameFixture);
