// Ported from @floating-ui/react's experimental NextFloatingDelayGroup. The
// ref-backed context keeps delay changes from re-rendering unrelated consumers.
import { createContext, createElement, useContext, useMemo, useRef, useState } from 'octane';
import type { OctaneNode } from 'octane';

import { S, splitSlot, subSlot } from './internal';
import { getDelay, clearTimeoutIfSet, useModernLayoutEffect } from './utils';
import type { Delay, FloatingRootContext, MutableRefObject } from './types';

interface CurrentContext {
	onOpenChange: (open: boolean) => void;
	setIsInstantPhase: (value: boolean) => void;
}

interface NextDelayGroupContextValue {
	hasProvider: boolean;
	timeoutMs: number;
	delayRef: MutableRefObject<Delay>;
	initialDelayRef: MutableRefObject<Delay>;
	timeoutIdRef: MutableRefObject<number>;
	currentIdRef: MutableRefObject<any>;
	currentContextRef: MutableRefObject<CurrentContext | null>;
}

const NextFloatingDelayGroupContext = createContext<NextDelayGroupContextValue>({
	hasProvider: false,
	timeoutMs: 0,
	delayRef: { current: 0 },
	initialDelayRef: { current: 0 },
	timeoutIdRef: { current: -1 },
	currentIdRef: { current: null },
	currentContextRef: { current: null },
});

export interface NextFloatingDelayGroupProps {
	children?: OctaneNode;
	delay: Delay;
	timeoutMs?: number;
}

export function NextFloatingDelayGroup(props: NextFloatingDelayGroupProps): OctaneNode {
	const delayRef = useRef(props.delay, S('NextFloatingDelayGroup:delay'));
	const initialDelayRef = useRef(props.delay, S('NextFloatingDelayGroup:initialDelay'));
	const currentIdRef = useRef<any>(null, S('NextFloatingDelayGroup:currentId'));
	const currentContextRef = useRef<CurrentContext | null>(
		null,
		S('NextFloatingDelayGroup:currentContext'),
	);
	const timeoutIdRef = useRef(-1, S('NextFloatingDelayGroup:timeoutId'));
	const timeoutMs = props.timeoutMs ?? 0;
	const value = useMemo<NextDelayGroupContextValue>(
		() => ({
			hasProvider: true,
			delayRef,
			initialDelayRef,
			currentIdRef,
			timeoutMs,
			currentContextRef,
			timeoutIdRef,
		}),
		[timeoutMs],
		S('NextFloatingDelayGroup:value'),
	);
	return createElement(NextFloatingDelayGroupContext.Provider, {
		value,
		children: props.children,
	});
}

export interface UseNextDelayGroupOptions {
	enabled?: boolean;
}

export interface UseNextDelayGroupReturn {
	delayRef: MutableRefObject<Delay>;
	isInstantPhase: boolean;
	hasProvider: boolean;
}

export function useNextDelayGroup(
	context: FloatingRootContext,
	options?: UseNextDelayGroupOptions,
	slot?: symbol,
): UseNextDelayGroupReturn;
export function useNextDelayGroup(...args: any[]): UseNextDelayGroupReturn {
	const [user, slot] = splitSlot(args);
	const context = user[0] as FloatingRootContext;
	const options = (user[1] as UseNextDelayGroupOptions) ?? {};
	const enabled = options.enabled ?? true;
	const groupContext = useContext(NextFloatingDelayGroupContext);
	const {
		currentIdRef,
		delayRef,
		timeoutMs,
		initialDelayRef,
		currentContextRef,
		hasProvider,
		timeoutIdRef,
	} = groupContext;
	const [isInstantPhase, setIsInstantPhase] = useState(false, subSlot(slot, 'instant'));

	useModernLayoutEffect(
		() => {
			function unset() {
				setIsInstantPhase(false);
				currentContextRef.current?.setIsInstantPhase(false);
				currentIdRef.current = null;
				currentContextRef.current = null;
				delayRef.current = initialDelayRef.current;
			}
			if (!enabled || !currentIdRef.current) return;
			if (!context.open && currentIdRef.current === context.floatingId) {
				setIsInstantPhase(false);
				if (timeoutMs) {
					timeoutIdRef.current = window.setTimeout(unset, timeoutMs);
					return () => clearTimeout(timeoutIdRef.current);
				}
				unset();
			}
		},
		[
			enabled,
			context.open,
			context.floatingId,
			currentIdRef,
			delayRef,
			timeoutMs,
			initialDelayRef,
			currentContextRef,
			timeoutIdRef,
		],
		subSlot(slot, 'unset'),
	);

	useModernLayoutEffect(
		() => {
			if (!enabled || !context.open) return;
			const previousContext = currentContextRef.current;
			const previousId = currentIdRef.current;
			currentContextRef.current = {
				onOpenChange: context.onOpenChange,
				setIsInstantPhase,
			};
			currentIdRef.current = context.floatingId;
			delayRef.current = {
				open: 0,
				close: getDelay(initialDelayRef.current, 'close'),
			};
			if (previousId !== null && previousId !== context.floatingId) {
				clearTimeoutIfSet(timeoutIdRef);
				setIsInstantPhase(true);
				previousContext?.setIsInstantPhase(true);
				previousContext?.onOpenChange(false);
			} else {
				setIsInstantPhase(false);
				previousContext?.setIsInstantPhase(false);
			}
		},
		[
			enabled,
			context.open,
			context.floatingId,
			context.onOpenChange,
			currentIdRef,
			delayRef,
			initialDelayRef,
			currentContextRef,
			timeoutIdRef,
		],
		subSlot(slot, 'open'),
	);

	useModernLayoutEffect(
		() => () => {
			currentContextRef.current = null;
		},
		[currentContextRef],
		subSlot(slot, 'cleanup'),
	);

	return useMemo(
		() => ({ hasProvider, delayRef, isInstantPhase }),
		[hasProvider, delayRef, isInstantPhase],
		subSlot(slot, 'return'),
	);
}
