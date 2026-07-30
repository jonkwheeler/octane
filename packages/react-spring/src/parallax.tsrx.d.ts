export interface IParallax {
	readonly current: number;
	readonly busy: boolean;
	scrollTo(offset: number): void;
	update(): void;
	stop(): void;
}

export interface ParallaxProps {
	pages: number;
	horizontal?: boolean;
	enabled?: boolean;
	ref?: { current: IParallax | null } | ((value: IParallax | null) => void);
	style?: Record<string, unknown>;
	children?: unknown;
	[key: string]: unknown;
}

export interface ParallaxLayerProps {
	offset?: number;
	speed?: number;
	factor?: number;
	sticky?: { start: number; end: number };
	style?: Record<string, unknown>;
	children?: unknown;
	[key: string]: unknown;
}

export declare function Parallax(props: ParallaxProps): unknown;
export declare function ParallaxLayer(props: ParallaxLayerProps): unknown;
