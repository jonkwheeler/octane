import { cloneElement, createElement, isValidElement, useEffect, useRef, useState } from 'octane';
import { findScrollableAncestor, getBounds, getCurrentPosition } from './geometry.js';
import {
	ABOVE,
	BELOW,
	INSIDE,
	INVISIBLE,
	type WaypointCallbackArgs,
	type WaypointPosition,
	type WaypointProps,
} from './types.js';

export function Waypoint(props: WaypointProps) {
	const [node, setNode] = useState<Element | null>(null);
	const previousPosition = useRef<WaypointPosition>(INVISIBLE);
	const latest = useRef(props);
	latest.current = props;

	useEffect(() => {
		if (typeof window === 'undefined' || !node) return;
		const ancestor = props.scrollableAncestor ?? findScrollableAncestor(node, props.horizontal);
		const measure = (event: Event | null) => {
			if (!node) return;
			const bounds = getBounds(node, ancestor, latest.current);
			const currentPosition = getCurrentPosition(bounds);
			const previous = previousPosition.current;
			if (currentPosition === previous) return;

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
				latest.current.onLeave?.(args);
			} else {
				if (currentPosition === INSIDE) latest.current.onEnter?.(args);
				if (previous === INSIDE) latest.current.onLeave?.(args);
			}
			previousPosition.current = currentPosition;
			if (latest.current.debug) {
				console.log('[Waypoint]', previous, '->', currentPosition, bounds);
			}
		};
		const onScroll = (event: Event) => measure(event);
		ancestor.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll, { passive: true });
		const timeout = window.setTimeout(() => measure(null), 0);
		return () => {
			window.clearTimeout(timeout);
			ancestor.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
		};
	}, [
		node,
		props.scrollableAncestor,
		props.horizontal,
		props.topOffset,
		props.bottomOffset,
		props.fireOnRapidScroll,
	]);

	if (props.children && isValidElement(props.children)) {
		return cloneElement(props.children, { ref: setNode });
	}
	return createElement('span', {
		ref: setNode,
		style: { fontSize: 0 },
	});
}
