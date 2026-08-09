import { useEffect, useState } from 'octane';
import { resolveHookSlot, subSlot } from './slot';

export function useReducedMotion(...rest: [slot?: symbol]): boolean {
	const slot = resolveHookSlot(rest);
	const [reduced, setReduced] = useState(false, subSlot(slot, 'state'));
	useEffect(
		function watchReducedMotion() {
			if (typeof matchMedia === 'undefined') return;
			const mq = matchMedia('(prefers-reduced-motion: reduce)');
			setReduced(mq.matches);
			const on = function onChange(event: MediaQueryListEvent) {
				setReduced(event.matches);
			};
			mq.addEventListener('change', on);
			return function cleanup() {
				mq.removeEventListener('change', on);
			};
		},
		[],
		subSlot(slot, 'effect'),
	);
	return reduced;
}
