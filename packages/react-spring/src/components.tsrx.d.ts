import type { SpringContextValue } from './context';
import type { ControllerUpdate, SpringValue } from './engine';
import type { UseTransitionProps } from './hooks';

type SpringValues<State extends Record<string, unknown>> = {
	[Key in keyof State]: SpringValue<State[Key]>;
};

export interface SpringProps<
	State extends Record<string, unknown>,
> extends ControllerUpdate<State> {
	children?: ((styles: SpringValues<State>) => unknown) | unknown;
}

export interface TrailProps<
	Item,
	State extends Record<string, unknown>,
> extends ControllerUpdate<State> {
	items?: Item[];
	children?: ((item: Item) => (styles: SpringValues<State> | undefined) => unknown) | unknown;
}

export interface TransitionProps<
	Item,
	State extends Record<string, unknown>,
> extends UseTransitionProps<Item, State> {
	items?: Item | Item[];
	children?: ((item: Item) => (styles: SpringValues<State>) => unknown) | unknown;
}

export declare function SpringContext(
	props: SpringContextValue & { children?: unknown },
	scope?: unknown,
): void;
export declare function Spring<State extends Record<string, unknown>>(
	props: SpringProps<State>,
): void;
export declare function Trail<Item, State extends Record<string, unknown>>(
	props: TrailProps<Item, State>,
): void;
export declare function Transition<Item, State extends Record<string, unknown>>(
	props: TransitionProps<Item, State>,
): void;
