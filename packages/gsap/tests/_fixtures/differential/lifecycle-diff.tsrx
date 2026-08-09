import { useRef, useState } from 'octane';
import { useGSAP } from '@octanejs/gsap';

/**
 * Exposes the useGSAP effect/cleanup sequence in the DOM so the differential
 * rig can prove @octanejs/gsap and @gsap/react deliver the same lifecycle.
 * Click `#bump` to advance the dependency the effect watches.
 */
export function GSAPLifecycleDiff(props: { revertOnUpdate?: boolean }) @{
	const scope = useRef<HTMLDivElement>(null);
	const [value, setValue] = useState('one');
	const [log, setLog] = useState('');
	useGSAP(function lifecycle(context, contextSafe) {
		const count = context.selector?.('.target').length ?? 0;
		setLog(function appendEffect(previous) {
			const next = `effect:${value}:${String(count)}`;
			return previous === '' ? next : `${previous}|${next}`;
		});
		const safeMark = contextSafe(function markSafe() {
			setLog(function appendSafe(previous) {
				const next = `safe:${value}`;
				return previous === '' ? next : `${previous}|${next}`;
			});
		});
		safeMark();
		return function cleanup() {
			setLog(function appendCleanup(previous) {
				const next = `cleanup:${value}`;
				return previous === '' ? next : `${previous}|${next}`;
			});
		};
	}, {
		scope,
		dependencies: [value],
		revertOnUpdate: props.revertOnUpdate,
	});

	function bump() {
		setValue(function nextValue(previous) {
			return previous === 'one' ? 'two' : 'three';
		});
	}

	<div ref={scope} class="probe">
		<button id="bump" type="button" onClick={bump}>
			bump
		</button>
		<span class="target">{value as string}</span>
		<pre class="log">{log as string}</pre>
	</div>
}
