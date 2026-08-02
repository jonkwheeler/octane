// Ported from @react-spring/types v10.1.2 (packages/types/src/interpolation.ts).
export type ExtrapolateType = 'identity' | 'clamp' | 'extend';
export type EasingFunction = (value: number) => number;

export interface InterpolatorConfig<Output = number> {
	range?: readonly number[];
	output: readonly Output[];
	easing?: EasingFunction;
	extrapolate?: ExtrapolateType;
	extrapolateLeft?: ExtrapolateType;
	extrapolateRight?: ExtrapolateType;
	map?: (value: number) => number;
}

export type InterpolatorFn<Output = number> = (value: number) => Output;
