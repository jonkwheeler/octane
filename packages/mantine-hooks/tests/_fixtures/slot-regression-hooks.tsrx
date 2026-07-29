import { useMediaQuery, useMouse, useMove, type UseMovePosition } from '@octanejs/mantine-hooks';

export function MoveDefaultDirectionHarness({
	onChange,
}: {
	onChange: (position: UseMovePosition) => void;
}) @{
	const { ref } = useMove(onChange, undefined);
	<div id="move-target" ref={ref} />
}

export function MediaQueryOmittedOptionsHarness() @{
	const matches = useMediaQuery('(min-width: 60rem)', false);
	<output id="media-result">
		{matches ? 'wide' : 'narrow'}
	</output>
}

export function MouseLifecycleHarness({ attached }: { attached: boolean }) @{
	const { ref, x, y } = useMouse<HTMLDivElement>();

	<section>
		<output id="mouse-position">{`${x},${y}`}</output>
		@if (attached) {
			<div id="mouse-target" ref={ref} />
		}
	</section>
}
