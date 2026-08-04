import { createRoot, useRef, useState } from 'octane';
import Draggable from '@octanejs/react-draggable';

const boxRef = { current: null as HTMLDivElement | null };
const svgRef = { current: null as SVGSVGElement | null };
const touchRef = { current: null as HTMLDivElement | null };

function BrowserFixture() @{
	const [trace, setTrace] = useState('idle');
	<div>
		<div id="bounds" style={{ position: 'relative', width: '140px', height: '120px' }}>
			<Draggable
				nodeRef={boxRef}
				bounds="parent"
				grid={[10, 10]}
				onStart={() => setTrace('start')}
				onDrag={(_event, data) => setTrace(`drag:${data.x},${data.y}`)}
				onStop={(_event, data) => setTrace(`stop:${data.x},${data.y}`)}
			>
				<div ref={boxRef} id="mouse-drag" style={{ width: '30px', height: '20px' }}>
					<input id="focus-input" value="focus" />
				</div>
			</Draggable>
		</div>
		<Draggable
			nodeRef={svgRef as unknown as { current: HTMLElement | null }}
			defaultPosition={{ x: 2, y: 3 }}
		>
			<svg ref={svgRef} id="svg-drag">
				<circle cx="4" cy="4" r="4" />
			</svg>
		</Draggable>
		<Draggable nodeRef={touchRef} onDrag={(_event, data) => setTrace(`touch:${data.x},${data.y}`)}>
			<div ref={touchRef} id="touch-drag">touch</div>
		</Draggable>
		<output id="trace">{trace as string}</output>
	</div>
}

createRoot(document.querySelector('#app')!).render(BrowserFixture);

function OwnerDocumentFixture(props: { id: string; bounds?: string }) @{
	const ref = useRef<HTMLDivElement | null>(null);
	const [trace, setTrace] = useState('idle');
	<div class="owner-bounds" style={{ position: 'relative', width: '120px', height: '100px' }}>
		<Draggable
			nodeRef={ref}
			bounds={props.bounds ?? false}
			onDrag={(_event, data) => setTrace(`drag:${data.x},${data.y}`)}
			onStop={(_event, data) => setTrace(`stop:${data.x},${data.y}`)}
		>
			<div ref={ref} id={`${props.id}-drag`} style={{ width: '20px', height: '20px' }}>drag</div>
		</Draggable>
		<output id={`${props.id}-trace`}>{trace as string}</output>
	</div>
}

const shadowHost = document.body.appendChild(document.createElement('div'));
shadowHost.id = 'shadow-host';
const shadowRoot = shadowHost.attachShadow({ mode: 'open' });
const shadowMount = shadowRoot.appendChild(document.createElement('div'));
createRoot(shadowMount).render(OwnerDocumentFixture, { id: 'shadow', bounds: '.owner-bounds' });

const frame = document.body.appendChild(document.createElement('iframe'));
frame.id = 'owner-frame';
frame.src = '/frame.html';

let callbackRoot: ReturnType<typeof createRoot>;
const callbackHost = document.body.appendChild(document.createElement('div'));
callbackHost.id = 'callback-host';
function CallbackUnmountFixture() @{
	const ref = useRef<HTMLDivElement | null>(null);
	<Draggable nodeRef={ref} onDrag={() => callbackRoot.unmount()}>
		<div ref={ref} id="callback-unmount-drag">drag</div>
	</Draggable>
}
callbackRoot = createRoot(callbackHost);
callbackRoot.render(CallbackUnmountFixture);

const activeHost = document.body.appendChild(document.createElement('div'));
activeHost.id = 'active-unmount-host';
const activeRoot = createRoot(activeHost);
activeRoot.render(OwnerDocumentFixture, { id: 'active-unmount' });

function ErrorFixture(props: { id: string; throwOnDrag?: boolean; bounds?: string }) @{
	const ref = useRef<HTMLDivElement | null>(null);
	const [moves, setMoves] = useState(0);
	<Draggable
		nodeRef={ref}
		bounds={props.bounds ?? false}
		onDrag={() => {
			setMoves((value) => value + 1);
			if (props.throwOnDrag) throw new Error('pinned-active-callback');
		}}
	>
		<div ref={ref} id={`${props.id}-drag`} data-moves={moves as number}>drag</div>
	</Draggable>
}
const callbackErrorHost = document.body.appendChild(document.createElement('div'));
createRoot(callbackErrorHost).render(ErrorFixture, { id: 'callback-error', throwOnDrag: true });
const selectorErrorHost = document.body.appendChild(document.createElement('div'));
createRoot(selectorErrorHost).render(ErrorFixture, {
	id: 'selector-error',
	bounds: '.missing-bound',
});

const mixedTrace: string[] = [];
function MixedInputFixture() @{
	const ref = useRef<HTMLDivElement | null>(null);
	<Draggable
		nodeRef={ref}
		onStart={(event) => mixedTrace.push(`start:${event.type}`)}
		onDrag={(event) => mixedTrace.push(`drag:${event.type}`)}
		onStop={(event) => mixedTrace.push(`stop:${event.type}`)}
	>
		<div ref={ref} id="mixed-drag">mixed</div>
	</Draggable>
}
const mixedHost = document.body.appendChild(document.createElement('div'));
createRoot(mixedHost).render(MixedInputFixture);

Object.assign(globalThis, {
	__reactDraggableU5: {
		shadowRoot,
		unmountActive: () => activeRoot.unmount(),
		mixedTrace,
	},
});
