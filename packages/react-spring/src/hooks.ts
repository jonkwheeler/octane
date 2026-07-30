// Octane hook adapter for react-spring/packages/core/src/hooks at v10.1.2.
import { useLayoutEffect, useState } from 'octane';
import {
	Controller,
	type ControllerUpdate,
	SpringRef,
	SpringValue,
	type SpringUpdate,
} from './engine';

const subCache = new Map<symbol, Map<string, symbol>>();

function sub(slot: symbol | undefined, tag: string): symbol | undefined {
	if (slot === undefined) return undefined;
	let tags = subCache.get(slot);
	if (tags === undefined) subCache.set(slot, (tags = new Map()));
	let value = tags.get(tag);
	if (value === undefined) {
		value = Symbol.for(`${slot.description ?? 'react-spring'}:${tag}`);
		tags.set(tag, value);
	}
	return value;
}

function trailingSlot(args: any[]): symbol | undefined {
	const tail = args[args.length - 1];
	return typeof tail === 'symbol' ? tail : undefined;
}

function updateFrom<State extends Record<string, any>>(
	props: ControllerUpdate<State> | (() => ControllerUpdate<State>),
): ControllerUpdate<State> {
	return typeof props === 'function' ? props() : props;
}

export function useSpring<State extends Record<string, any>>(
	props: ControllerUpdate<State> | (() => ControllerUpdate<State>),
	...args: any[]
): [{ [Key in keyof State]: SpringValue<State[Key]> }, Controller<State>] {
	const slot = trailingSlot(args);
	const update = updateFrom(props);
	const [controller] = useState(() => new Controller<State>(update), sub(slot, 'controller'));
	const deps = args.find(Array.isArray) as any[] | undefined;
	useLayoutEffect(
		() => {
			void controller.start(update);
			return () => {
				controller.stop(true);
			};
		},
		deps ?? [update],
		sub(slot, 'effect'),
	);
	return [controller.springs, controller];
}

export function useSpringValue<T>(
	initial: T,
	props?: Omit<SpringUpdate<T>, 'to'>,
	...args: any[]
): SpringValue<T> {
	const slot = trailingSlot(args);
	const [value] = useState(() => new SpringValue(initial), sub(slot, 'value'));
	useLayoutEffect(
		() => () => {
			value.stop(true);
		},
		[],
		sub(slot, 'cleanup'),
	);
	if (props?.from !== undefined && value.get() === initial) value.set(props.from);
	return value;
}

export function useSprings<State extends Record<string, any>>(
	length: number,
	props:
		| ControllerUpdate<State>[]
		| ((index: number, controller: Controller<State>) => ControllerUpdate<State>),
	...args: any[]
): [{ [Key in keyof State]: SpringValue<State[Key]> }[], SpringRef<State>] {
	const slot = trailingSlot(args);
	const [state] = useState(
		() => ({ controllers: [] as Controller<State>[], ref: new SpringRef<State>() }),
		sub(slot, 'state'),
	);
	while (state.controllers.length < length) {
		const controller = new Controller<State>();
		state.controllers.push(controller);
		state.ref.add(controller);
	}
	while (state.controllers.length > length) {
		const controller = state.controllers.pop()!;
		controller.stop(true);
		state.ref.delete(controller);
	}
	const updates = state.controllers.map((controller, index) =>
		typeof props === 'function' ? props(index, controller) : props[index] ?? {},
	);
	useLayoutEffect(
		() => {
			updates.forEach((update, index) => void state.controllers[index].start(update));
			return () => state.controllers.forEach((controller) => controller.stop(true));
		},
		[JSON.stringify(updates)],
		sub(slot, 'effect'),
	);
	return [state.controllers.map((controller) => controller.springs), state.ref];
}

export function useTrail<State extends Record<string, any>>(
	length: number,
	props: ControllerUpdate<State> | (() => ControllerUpdate<State>),
	...args: any[]
) {
	const slot = trailingSlot(args);
	const update = updateFrom(props);
	return useSprings(
		length,
		(index) => ({
			...update,
			config: update.config,
			to: update.to,
			...(index > 0 ? { delay: index * 16 } : {}),
		}),
		slot,
	);
}

export function useSpringRef<State extends Record<string, any>>(...args: any[]): SpringRef<State> {
	const slot = trailingSlot(args);
	return useState(() => new SpringRef<State>(), sub(slot, 'ref'))[0];
}

export function useChain(refs: SpringRef<any>[], timeSteps?: number[], timeFrame = 1000): void {
	useLayoutEffect(
		() => {
			const timers = refs.map((ref, index) =>
				setTimeout(
					() => void ref.start(),
					timeSteps === undefined ? index * 16 : (timeSteps[index] ?? 0) * timeFrame,
				),
			);
			return () => timers.forEach(clearTimeout);
		},
		[refs, timeSteps, timeFrame],
	);
}
