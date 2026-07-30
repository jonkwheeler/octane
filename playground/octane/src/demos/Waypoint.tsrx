import { Waypoint, type WaypointPosition } from '@octanejs/waypoint';
import { useState } from 'octane';

export function WaypointDemo() @{
	const [position, setPosition] = useState<WaypointPosition>('invisible');
	<div style={{ display: 'grid', gap: '1rem' }}>
		<p>
			Current position:
			<strong data-testid="waypoint-position">{position}</strong>
		</p>
		<div
			data-testid="waypoint-scroller"
			style={{
				maxHeight: '55vh',
				overflow: 'auto',
				border: '1px solid var(--border)',
				borderRadius: '0.75rem',
				padding: '1rem',
			}}
		>
			<div style={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}>
				Scroll to cross the waypoint.
			</div>
			<Waypoint
				onPositionChange={({ currentPosition }) => setPosition(currentPosition)}
				children={<div
					data-testid="waypoint-target"
					style={{
						minHeight: '10rem',
						display: 'grid',
						placeItems: 'center',
						borderRadius: '0.75rem',
						background: 'var(--primary)',
						color: 'var(--primary-foreground)',
					}}
				>
					Waypoint target
				</div>}
			/>
			<div style={{ minHeight: '70vh' }} />
		</div>
	</div>
}
