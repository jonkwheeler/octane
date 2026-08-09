// @ts-nocheck -- browser fixture exercises React-compatible pointer props.
import { createRoot, delegateEvents, useState } from 'octane';
import { Drawer } from '../../../src/index.tsrx';
import '../../../src/style.css';

delegateEvents(['click', 'keydown', 'pointercancel', 'pointerdown', 'pointermove', 'pointerup']);

const startOpen = new URLSearchParams(window.location.search).get('fixture') === 'initial-snap';

function BrowserDrawer() @{
	const [open, setOpen] = useState(startOpen);
	const [activeSnapPoint, setActiveSnapPoint] = useState<number | string | null>(0.25);

	<main>
		<output id="drawer-state">
			{open ? 'open' : 'closed'}
		</output>
		<output id="snap-point">{String(activeSnapPoint)}</output>
		<Drawer.Root
			open={open}
			onOpenChange={setOpen}
			autoFocus
			snapPoints={[0.25, 0.75]}
			activeSnapPoint={activeSnapPoint}
			setActiveSnapPoint={setActiveSnapPoint}
		>
			<Drawer.Trigger>Open drawer</Drawer.Trigger>
			<Drawer.Portal>
				<Drawer.Overlay style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)' }} />
				<Drawer.Content
					style={{
						position: 'fixed',
						left: 0,
						right: 0,
						bottom: 0,
						height: '800px',
						background: 'white',
					}}
				>
					<Drawer.Handle />
					<Drawer.Title>Browser drawer</Drawer.Title>
					<Drawer.Description>Drag and snap parity fixture.</Drawer.Description>
					<Drawer.Close>Close drawer</Drawer.Close>
				</Drawer.Content>
			</Drawer.Portal>
		</Drawer.Root>
	</main>
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('missing #root');
createRoot(rootElement).render(BrowserDrawer);
