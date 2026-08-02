import {
	cloneElement,
	isValidElement,
	useLayoutEffect,
	useRef,
	useState,
	type ElementDescriptor,
} from 'octane';
import { ENTERED, ENTERING, EXITING } from './Transition.tsrx';
import TransitionGroupContext from './TransitionGroupContext.ts';
import type { SwitchTransitionProps, TransitionCallbacks, TransitionStatus } from './types.ts';

export const modes = { out: 'out-in', in: 'in-out' } as const;

function different(a: ElementDescriptor | null, b: ElementDescriptor | null | undefined) {
	if (a === b) return false;
	return !(isValidElement(a) && isValidElement(b) && a.key != null && a.key === b.key);
}

function chain(element: ElementDescriptor, name: keyof TransitionCallbacks, callback: () => void) {
	return (...args: unknown[]) => {
		(element.props[name] as ((...values: unknown[]) => void) | undefined)?.(...args);
		callback();
	};
}

export function SwitchTransition(props: SwitchTransitionProps) @{
	const appeared = useRef(false);
	const [status, setStatus] = useState<TransitionStatus>(ENTERED);
	const [current, setCurrent] = useState<ElementDescriptor | null>(
		props.children ? cloneElement(props.children, { in: true }) : null,
	);
	const pending = props.children ?? null;
	const mode = props.mode ?? modes.out;

	useLayoutEffect(() => {
		appeared.current = true;
	}, []);

	useLayoutEffect(() => {
		const next = props.children ?? null;
		if (!next) {
			setCurrent(null);
			return;
		}
		if (current && different(current, next) && status === ENTERED) {
			setStatus(EXITING);
		} else if (!current || !different(current, next)) {
			setCurrent(cloneElement(next, { in: true }));
		}
	}, [props.children]);

	let output: unknown = current;
	if (status === EXITING && current && pending) {
		if (mode === modes.out) {
			output = cloneElement(current, {
				in: false,
				onExited: chain(current, 'onExited', () => {
					setCurrent(null);
					setStatus(ENTERING);
				}),
			});
		} else {
			output = [
				current,
				cloneElement(pending, {
					in: true,
					onEntered: chain(pending, 'onEntered', () => setStatus(ENTERING)),
				}),
			];
		}
	} else if (status === ENTERING && pending) {
		if (mode === modes.out) {
			output = cloneElement(pending, {
				in: true,
				onEntered: chain(pending, 'onEntered', () => {
					setCurrent(cloneElement(pending, { in: true }));
					setStatus(ENTERED);
				}),
			});
		} else if (current) {
			output = [
				cloneElement(current, {
					in: false,
					onExited: chain(current, 'onExited', () => {
						setCurrent(cloneElement(pending, { in: true }));
						setStatus(ENTERED);
					}),
				}),
				cloneElement(pending, { in: true }),
			];
		}
	}

	<TransitionGroupContext.Provider
		value={{ isMounting: !appeared.current }}
	>{output}</TransitionGroupContext.Provider>
}

export default SwitchTransition;
