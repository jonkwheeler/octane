// Octane hook adapter for react-spring/packages/core/src/hooks at v10.1.2.
import { useLayoutEffect, useState } from 'octane';
import {
	Controller,
	type ControllerUpdate,
	SpringRef,
	SpringValue,
	type SpringUpdate,
} from './engine';
import { type SpringContextValue, useSpringContext } from './context';

export type TransitionPhase = 'mount' | 'enter' | 'update' | 'leave';

export interface UseTransitionProps<
	Item,
	State extends Record<string, any>,
> extends ControllerUpdate<State> {
	keys?: ((item: Item) => string | number) | Array<string | number>;
	initial?: Partial<State> | null;
	enter?: Partial<State> | ((item: Item) => Partial<State>);
	update?: Partial<State> | ((item: Item) => Partial<State>);
	leave?: Partial<State> | ((item: Item) => Partial<State>);
	sort?: (a: Item, b: Item) => number;
	expires?: boolean | number;
	exitBeforeEnter?: boolean;
}

interface TransitionRecord<Item, State extends Record<string, any>> {
	key: string | number;
	item: Item;
	phase: TransitionPhase;
	controller: Controller<State>;
}

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

function withContext<State extends Record<string, any>>(
	update: ControllerUpdate<State>,
	context: SpringContextValue,
): ControllerUpdate<State> {
	return { ...update, ...context } as ControllerUpdate<State>;
}

export function useSpring<State extends Record<string, any>>(
	props: ControllerUpdate<State> | (() => ControllerUpdate<State>),
	...args: any[]
): [{ [Key in keyof State]: SpringValue<State[Key]> }, Controller<State>] {
	const slot = trailingSlot(args);
	const context = useSpringContext();
	const update = withContext(updateFrom(props), context);
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
	propsOrSlot?: Omit<SpringUpdate<T>, 'to'> | symbol,
	...args: any[]
): SpringValue<T> {
	const slot = typeof propsOrSlot === 'symbol' ? propsOrSlot : trailingSlot(args);
	const props = typeof propsOrSlot === 'symbol' ? undefined : propsOrSlot;
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
	const context = useSpringContext();
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
		withContext(
			typeof props === 'function' ? props(index, controller) : (props[index] ?? {}),
			context,
		),
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
			delay: (update.delay ?? 0) + index * 16,
		}),
		slot,
	);
}

export function useSpringRef<State extends Record<string, any>>(...args: any[]): SpringRef<State> {
	const slot = trailingSlot(args);
	return useState(() => new SpringRef<State>(), sub(slot, 'ref'))[0];
}

function resolveTransitionValue<Item, State extends Record<string, any>>(
	value: Partial<State> | ((item: Item) => Partial<State>) | undefined,
	item: Item,
): Partial<State> | undefined {
	return typeof value === 'function' ? value(item) : value;
}

export function useTransition<Item, State extends Record<string, any>>(
	items: Item | Item[],
	props: UseTransitionProps<Item, State>,
	...args: any[]
): (
	render: (
		values: { [Key in keyof State]: SpringValue<State[Key]> },
		item: Item,
		transition: { key: string | number; phase: TransitionPhase },
		index: number,
	) => unknown,
) => unknown[] {
	const slot = trailingSlot(args);
	const context = useSpringContext();
	const list = (Array.isArray(items) ? items : [items]).filter(
		(item): item is Item => item !== undefined && item !== null,
	);
	const [, forceUpdate] = useState(0, sub(slot, 'version'));
	const [records] = useState(
		() => [] as Array<TransitionRecord<Item, State>>,
		sub(slot, 'records'),
	);
	const nextKeys = list.map((item, index) =>
		typeof props.keys === 'function'
			? props.keys(item)
			: Array.isArray(props.keys)
				? props.keys[index]
				: ((item as any)?.key ?? (item as any)?.id ?? (item as any)),
	);
	const nextKeySet = new Set(nextKeys);

	for (const record of records) {
		if (!nextKeySet.has(record.key) && record.phase !== 'leave') record.phase = 'leave';
	}
	list.forEach((item, index) => {
		const key = nextKeys[index]!;
		const existing = records.find((record) => record.key === key);
		if (existing !== undefined) {
			existing.item = item;
			existing.phase = existing.phase === 'leave' ? 'enter' : 'update';
			return;
		}
		const from = (props.initial === null ? props.from : (props.initial ?? props.from)) as
			Partial<State> | undefined;
		records.push({
			key,
			item,
			phase: 'enter',
			controller: new Controller<State>({ from }),
		});
	});
	if (props.sort !== undefined) {
		records.sort((a, b) => props.sort!(a.item, b.item));
	} else {
		const active = nextKeys.map((key) => records.find((record) => record.key === key)!);
		const leaving = records.filter((record) => !nextKeySet.has(record.key));
		records.splice(0, records.length, ...active, ...leaving);
	}

	const signature = records.map((record) => `${String(record.key)}:${record.phase}`).join('|');
	useLayoutEffect(
		() => {
			let active = true;
			for (const record of [...records]) {
				const target =
					record.phase === 'leave'
						? resolveTransitionValue(props.leave, record.item)
						: record.phase === 'update'
							? resolveTransitionValue(props.update ?? props.enter, record.item)
							: resolveTransitionValue(props.enter, record.item);
				const phase = record.phase;
				void record.controller
					.start(
						withContext(
							{
								to: target,
								config: props.config,
								immediate: props.immediate,
							},
							context,
						),
					)
					.then(() => {
						if (!active || phase !== 'leave' || record.phase !== 'leave') return;
						const expiration = props.expires ?? true;
						const remove = () => {
							const index = records.indexOf(record);
							if (index >= 0) {
								records.splice(index, 1);
								forceUpdate((value) => value + 1);
							}
						};
						if (typeof expiration === 'number' && expiration > 0) setTimeout(remove, expiration);
						else if (expiration !== false) remove();
					});
			}
			return () => {
				active = false;
			};
		},
		[signature, props, context],
		sub(slot, 'transition-effect'),
	);
	useLayoutEffect(
		() => () => {
			records.forEach((record) => record.controller.stop(true));
			records.length = 0;
		},
		[],
		sub(slot, 'transition-cleanup'),
	);

	return (render) =>
		records.map((record, index) =>
			render(
				record.controller.springs,
				record.item,
				{ key: record.key, phase: record.phase },
				index,
			),
		);
}

export function useChain(refs: SpringRef<any>[], timeSteps?: number[], timeFrame = 1000): void {
	useLayoutEffect(() => {
		const timers = refs.map((ref, index) =>
			setTimeout(
				() => void ref.start(),
				timeSteps === undefined ? index * 16 : (timeSteps[index] ?? 0) * timeFrame,
			),
		);
		return () => timers.forEach(clearTimeout);
	}, [refs, timeSteps, timeFrame]);
}
