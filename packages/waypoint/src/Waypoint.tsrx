import {
	cloneElement,
	createElement,
	isValidElement,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'octane';
import {
	findScrollableAncestor,
	getBounds,
	getCurrentPosition,
	resolveScrollableAncestorProp,
} from './geometry.js';
import { onNextTick } from './onNextTick.js';
import {
	ABOVE,
	BELOW,
	INSIDE,
	INVISIBLE,
	type WaypointCallbackArgs,
	type WaypointPosition,
	type WaypointProps,
} from './types.js';

function WaypointComponent(props: WaypointProps) {
	const [node, setNode] = useState<Element | null>(null);
	const previousPosition = useRef<WaypointPosition | undefined>(undefined);
	const latest = useRef(props);
	latest.current = props;
	const childRef =
		props.children && isValidElement(props.children)
			? (props.children as any).props?.ref
			: undefined;
	const mergedRef = useMemo(() => [childRef, setNode], [childRef]);
	const ancestor =
		node
			? props.scrollableAncestor != null
				? resolveScrollableAncestorProp(props.scrollableAncestor)
				: findScrollableAncestor(node, props.horizontal)
			: null;
	const measure = useCallback((event: Event | null) => {
		if (!node || !ancestor) return;
		const bounds = getBounds(node, ancestor, latest.current);
		const currentPosition = getCurrentPosition(bounds);
		const previous = previousPosition.current;
		if (currentPosition === previous) return;
		previousPosition.current = currentPosition;

		const args: WaypointCallbackArgs = {
			currentPosition,
			previousPosition: previous,
			event,
			...bounds,
		};
		latest.current.onPositionChange?.(args);

		const rapidDown = previous === ABOVE && currentPosition === BELOW;
		const rapidUp = previous === BELOW && currentPosition === ABOVE;
		if ((rapidDown || rapidUp) && latest.current.fireOnRapidScroll !== false) {
			const insideArgs: WaypointCallbackArgs = { ...args, currentPosition: INSIDE };
			latest.current.onEnter?.(insideArgs);
			latest.current.onLeave?.({ ...args, previousPosition: INSIDE });
		} else {
			if (currentPosition === INSIDE) latest.current.onEnter?.(args);
			if (previous === INSIDE) latest.current.onLeave?.(args);
		}
		if (latest.current.debug) {
			console.log('[Waypoint]', previous, '->', currentPosition, bounds);
		}
	}, [node, ancestor]);

	useEffect(() => {
		if (typeof window === 'undefined' || !node || !ancestor) return;
		const onScroll = (event: Event) => measure(event);
		ancestor.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll, { passive: true });
		return () => {
			ancestor.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
		};
	}, [node, ancestor, measure]);

	useEffect(() => {
		if (typeof window === 'undefined' || !node) return;
		return onNextTick(function measureOnNextTick() {
			measure(null);
		});
	}, null);

	if (props.children && isValidElement(props.children)) {
		return cloneElement(props.children, {
			ref: mergedRef,
		});
	}
	return createElement('span', {
		ref: setNode,
		style: { fontSize: 0 },
	});
}

export const Waypoint = Object.assign(WaypointComponent, {
	above: ABOVE,
	below: BELOW,
	inside: INSIDE,
	invisible: INVISIBLE,
});
