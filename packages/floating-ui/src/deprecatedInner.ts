// Ported from @floating-ui/react's deprecated inner middleware and interaction
// hook. Kept for exact 0.27.19 surface compatibility.
import {
	offset,
	type Derivable,
	type DetectOverflowOptions,
	type Middleware,
	type MiddlewareState,
	type SideObject,
} from '@floating-ui/dom';
import { evaluate, max, min, round } from '@floating-ui/utils';
import { flushSync, useEffect, useMemo, useRef } from 'octane';

import { splitSlot, subSlot } from './internal';
import { getUserAgent, useEffectEvent } from './utils';
import type { ElementProps, FloatingRootContext, MutableRefObject } from './types';

function getArgsWithCustomFloatingHeight(state: MiddlewareState, height: number) {
	return {
		...state,
		rects: {
			...state.rects,
			floating: { ...state.rects.floating, height },
		},
	};
}

export interface InnerProps extends DetectOverflowOptions {
	listRef: MutableRefObject<Array<HTMLElement | null>>;
	index: number;
	onFallbackChange?: null | ((fallback: boolean) => void);
	offset?: number;
	overflowRef?: MutableRefObject<SideObject | null>;
	scrollRef?: MutableRefObject<HTMLElement | null>;
	minItemsVisible?: number;
	referenceOverflowThreshold?: number;
}

/** @deprecated */
export const inner = (props: InnerProps | Derivable<InnerProps>): Middleware => ({
	name: 'inner',
	options: props,
	async fn(state) {
		const {
			listRef,
			overflowRef,
			onFallbackChange,
			offset: innerOffset = 0,
			index = 0,
			minItemsVisible = 4,
			referenceOverflowThreshold = 0,
			scrollRef,
			...detectOverflowOptions
		} = evaluate(props, state);
		const {
			rects,
			platform,
			elements: { floating },
		} = state;
		const item = listRef.current[index];
		const scrollElement = scrollRef?.current || floating;
		const clientTop = floating.clientTop || scrollElement.clientTop;
		const floatingIsBordered = floating.clientTop !== 0;
		const scrollElementIsBordered = scrollElement.clientTop !== 0;
		const floatingIsScrollElement = floating === scrollElement;
		if (!item) return {};

		const nextArgs = {
			...state,
			...(await offset(
				-item.offsetTop -
					floating.clientTop -
					rects.reference.height / 2 -
					item.offsetHeight / 2 -
					innerOffset,
			).fn(state)),
		};
		const overflow = await platform.detectOverflow(
			getArgsWithCustomFloatingHeight(
				nextArgs,
				scrollElement.scrollHeight + clientTop + floating.clientTop,
			),
			detectOverflowOptions,
		);
		const referenceOverflow = await platform.detectOverflow(nextArgs, {
			...detectOverflowOptions,
			elementContext: 'reference',
		});
		const diffY = max(0, overflow.top);
		const nextY = nextArgs.y + diffY;
		const isScrollable = scrollElement.scrollHeight > scrollElement.clientHeight;
		const rounder = isScrollable ? (value: number) => value : round;
		const maxHeight = rounder(
			max(
				0,
				scrollElement.scrollHeight +
					((floatingIsBordered && floatingIsScrollElement) || scrollElementIsBordered
						? clientTop * 2
						: 0) -
					diffY -
					max(0, overflow.bottom),
			),
		);
		scrollElement.style.maxHeight = `${maxHeight}px`;
		scrollElement.scrollTop = diffY;

		if (onFallbackChange) {
			const shouldFallback =
				scrollElement.offsetHeight <
					item.offsetHeight * min(minItemsVisible, listRef.current.length) - 1 ||
				referenceOverflow.top >= -referenceOverflowThreshold ||
				referenceOverflow.bottom >= -referenceOverflowThreshold;
			flushSync(() => onFallbackChange(shouldFallback));
		}
		if (overflowRef) {
			overflowRef.current = await platform.detectOverflow(
				getArgsWithCustomFloatingHeight(
					{ ...nextArgs, y: nextY },
					scrollElement.offsetHeight + clientTop + floating.clientTop,
				),
				detectOverflowOptions,
			);
		}
		return { y: nextY };
	},
});

export interface UseInnerOffsetProps {
	enabled?: boolean;
	overflowRef: MutableRefObject<SideObject | null>;
	scrollRef?: MutableRefObject<HTMLElement | null>;
	onChange: (offset: number | ((offset: number) => number)) => void;
}

/** @deprecated */
export function useInnerOffset(
	context: FloatingRootContext,
	props: UseInnerOffsetProps,
	slot?: symbol,
): ElementProps;
export function useInnerOffset(...args: any[]): ElementProps {
	const [user, slot] = splitSlot(args);
	const context = user[0] as FloatingRootContext;
	const props = user[1] as UseInnerOffsetProps;
	const enabled = props.enabled ?? true;
	const overflowRef = props.overflowRef;
	const scrollRef = props.scrollRef;
	const onChange = useEffectEvent(props.onChange, subSlot(slot, 'onChange'));
	const controlledScrollingRef = useRef(false, subSlot(slot, 'controlled'));
	const previousScrollTopRef = useRef<number | null>(null, subSlot(slot, 'scrollTop'));
	const initialOverflowRef = useRef<SideObject | null>(null, subSlot(slot, 'overflow'));

	useEffect(
		() => {
			if (!enabled) return;
			const element = scrollRef?.current || context.elements.floating;
			if (!context.open || !element) return;
			function onWheel(event: WheelEvent) {
				if (event.ctrlKey || !element || overflowRef.current == null) return;
				const deltaY = event.deltaY;
				const isAtTop = overflowRef.current.top >= -0.5;
				const isAtBottom = overflowRef.current.bottom >= -0.5;
				const remainingScroll = element.scrollHeight - element.clientHeight;
				const sign = deltaY < 0 ? -1 : 1;
				const method = deltaY < 0 ? 'max' : 'min';
				if (element.scrollHeight <= element.clientHeight) return;
				if ((!isAtTop && deltaY > 0) || (!isAtBottom && deltaY < 0)) {
					event.preventDefault();
					flushSync(() =>
						onChange((offset) => offset + Math[method](deltaY, remainingScroll * sign)),
					);
				} else if (/firefox/i.test(getUserAgent())) {
					element.scrollTop += deltaY;
				}
			}
			element.addEventListener('wheel', onWheel);
			requestAnimationFrame(() => {
				previousScrollTopRef.current = element.scrollTop;
				if (overflowRef.current != null) initialOverflowRef.current = { ...overflowRef.current };
			});
			return () => {
				previousScrollTopRef.current = null;
				initialOverflowRef.current = null;
				element.removeEventListener('wheel', onWheel);
			};
		},
		[enabled, context.open, context.elements.floating, overflowRef, scrollRef, onChange],
		subSlot(slot, 'effect'),
	);

	const floating = useMemo<ElementProps['floating']>(
		() => ({
			onKeyDown() {
				controlledScrollingRef.current = true;
			},
			onWheel() {
				controlledScrollingRef.current = false;
			},
			onPointerMove() {
				controlledScrollingRef.current = false;
			},
			onScroll() {
				const element = scrollRef?.current || context.elements.floating;
				if (!overflowRef.current || !element || !controlledScrollingRef.current) return;
				if (previousScrollTopRef.current !== null) {
					const scrollDiff = element.scrollTop - previousScrollTopRef.current;
					if (
						(overflowRef.current.bottom < -0.5 && scrollDiff < -1) ||
						(overflowRef.current.top < -0.5 && scrollDiff > 1)
					) {
						flushSync(() => onChange((offset) => offset + scrollDiff));
					}
				}
				requestAnimationFrame(() => {
					previousScrollTopRef.current = element.scrollTop;
				});
			},
		}),
		[context.elements.floating, onChange, overflowRef, scrollRef],
		subSlot(slot, 'floating'),
	);
	return useMemo(() => (enabled ? { floating } : {}), [enabled, floating], subSlot(slot, 'return'));
}
