import type { SpringContextValue } from './context';

export declare function SpringContext(
	props: SpringContextValue & { children?: unknown },
	scope?: unknown,
): void;
export declare function Spring(props: Record<string, any>): void;
export declare function Trail(props: Record<string, any>): void;
export declare function Transition(props: Record<string, any>): void;
