// Behavioral ports of public helpers exported by @react-spring/web@10.1.2.
import { raf } from '@react-spring/rafz';
export { Globals } from './shared/globals';

export class Any {}

export class BailSignal extends Error {
	result: unknown;

	constructor() {
		super(
			'An async animation has been interrupted. You see this error because you forgot to use `await` or `.catch(...)` on its returned promise.',
		);
	}
}

export const update = raf.advance;

export interface InterpolatorConfig<T = number> {
	range?: readonly number[];
	output: readonly T[];
	extrapolate?: 'identity' | 'clamp' | 'extend';
	extrapolateLeft?: 'identity' | 'clamp' | 'extend';
	extrapolateRight?: 'identity' | 'clamp' | 'extend';
	easing?: (value: number) => number;
	map?: (value: number) => number;
}

export function createInterpolator<T>(
	rangeOrConfig: readonly number[] | ((value: number) => T) | InterpolatorConfig<T>,
	output?: readonly T[],
	extrapolate?: 'identity' | 'clamp' | 'extend',
): (value: number) => T {
	if (typeof rangeOrConfig === 'function') return rangeOrConfig;
	const config: InterpolatorConfig<T> = Array.isArray(rangeOrConfig)
		? { range: rangeOrConfig, output: output!, extrapolate }
		: (rangeOrConfig as InterpolatorConfig<T>);
	const input = config.range ?? [0, 1];
	return (value) => {
		let index = 0;
		while (index < input.length - 2 && value > input[index + 1]!) index++;
		const min = input[index]!;
		const max = input[index + 1]!;
		const left = config.extrapolateLeft ?? config.extrapolate ?? 'extend';
		const right = config.extrapolateRight ?? config.extrapolate ?? 'extend';
		if (config.map !== undefined) value = config.map(value);
		if (value < min && left === 'identity') return value as T;
		if (value > max && right === 'identity') return value as T;
		if (left === 'clamp') value = Math.max(min, value);
		if (right === 'clamp') value = Math.min(max, value);
		let progress = min === max ? (value <= min ? 0 : 1) : (value - min) / (max - min);
		progress = (config.easing ?? easings.linear)(progress);
		const from = config.output[index]!;
		const to = config.output[index + 1]!;
		if (typeof from === 'number' && typeof to === 'number') {
			return (from + (to - from) * progress) as T;
		}
		return (progress < 1 ? from : to) as T;
	};
}

const bounceOut = (x: number) => {
	const n = 7.5625;
	const d = 2.75;
	if (x < 1 / d) return n * x * x;
	if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
	if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
	return n * (x -= 2.625 / d) * x + 0.984375;
};

export const easings = {
	linear: (x: number) => x,
	easeInQuad: (x: number) => x * x,
	easeOutQuad: (x: number) => 1 - (1 - x) * (1 - x),
	easeInOutQuad: (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
	easeInCubic: (x: number) => x * x * x,
	easeOutCubic: (x: number) => 1 - Math.pow(1 - x, 3),
	easeInOutCubic: (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
	easeInQuart: (x: number) => x ** 4,
	easeOutQuart: (x: number) => 1 - (1 - x) ** 4,
	easeInOutQuart: (x: number) => (x < 0.5 ? 8 * x ** 4 : 1 - (-2 * x + 2) ** 4 / 2),
	easeInQuint: (x: number) => x ** 5,
	easeOutQuint: (x: number) => 1 - (1 - x) ** 5,
	easeInOutQuint: (x: number) => (x < 0.5 ? 16 * x ** 5 : 1 - (-2 * x + 2) ** 5 / 2),
	easeInSine: (x: number) => 1 - Math.cos((x * Math.PI) / 2),
	easeOutSine: (x: number) => Math.sin((x * Math.PI) / 2),
	easeInOutSine: (x: number) => -(Math.cos(Math.PI * x) - 1) / 2,
	easeInExpo: (x: number) => (x === 0 ? 0 : 2 ** (10 * x - 10)),
	easeOutExpo: (x: number) => (x === 1 ? 1 : 1 - 2 ** (-10 * x)),
	easeInOutExpo: (x: number) =>
		x === 0 ? 0 : x === 1 ? 1 : x < 0.5 ? 2 ** (20 * x - 10) / 2 : (2 - 2 ** (-20 * x + 10)) / 2,
	easeInCirc: (x: number) => 1 - Math.sqrt(1 - x ** 2),
	easeOutCirc: (x: number) => Math.sqrt(1 - (x - 1) ** 2),
	easeInOutCirc: (x: number) =>
		x < 0.5 ? (1 - Math.sqrt(1 - (2 * x) ** 2)) / 2 : (Math.sqrt(1 - (-2 * x + 2) ** 2) + 1) / 2,
	easeInBack: (x: number) => 2.70158 * x ** 3 - 1.70158 * x ** 2,
	easeOutBack: (x: number) => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2,
	easeInOutBack: (x: number) => {
		const c = 1.70158 * 1.525;
		return x < 0.5
			? ((2 * x) ** 2 * ((c + 1) * 2 * x - c)) / 2
			: ((2 * x - 2) ** 2 * ((c + 1) * (2 * x - 2) + c) + 2) / 2;
	},
	easeInElastic: (x: number) =>
		x === 0
			? 0
			: x === 1
				? 1
				: -(2 ** (10 * x - 10)) * Math.sin((10 * x - 10.75) * ((2 * Math.PI) / 3)),
	easeOutElastic: (x: number) =>
		x === 0
			? 0
			: x === 1
				? 1
				: 2 ** (-10 * x) * Math.sin((10 * x - 0.75) * ((2 * Math.PI) / 3)) + 1,
	easeInOutElastic: (x: number) => {
		const c = (2 * Math.PI) / 4.5;
		return x === 0
			? 0
			: x === 1
				? 1
				: x < 0.5
					? -(2 ** (20 * x - 10) * Math.sin((20 * x - 11.125) * c)) / 2
					: (2 ** (-20 * x + 10) * Math.sin((20 * x - 11.125) * c)) / 2 + 1;
	},
	easeInBounce: (x: number) => 1 - bounceOut(1 - x),
	easeOutBounce: bounceOut,
	easeInOutBounce: (x: number) =>
		x < 0.5 ? (1 - bounceOut(1 - 2 * x)) / 2 : (1 + bounceOut(2 * x - 1)) / 2,
	steps:
		(count: number, direction: 'start' | 'end' = 'end') =>
		(progress: number) => {
			progress = direction === 'end' ? Math.min(progress, 0.999) : Math.max(progress, 0.001);
			return Math.max(
				0,
				Math.min(
					1,
					(direction === 'end' ? Math.floor(progress * count) : Math.ceil(progress * count)) /
						count,
				),
			);
		},
} as const;

const RESERVED = new Set([
	'config',
	'from',
	'to',
	'ref',
	'loop',
	'reset',
	'pause',
	'cancel',
	'reverse',
	'immediate',
	'default',
	'delay',
	'onProps',
	'onStart',
	'onChange',
	'onPause',
	'onResume',
	'onRest',
	'onResolve',
	'items',
	'trail',
	'sort',
	'expires',
	'initial',
	'enter',
	'update',
	'leave',
	'children',
	'onDestroyed',
	'keys',
]);

export function inferTo<T extends object>(props: T): T & { to?: object } {
	const to: Record<string, unknown> = {};
	const rest: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(props)) {
		(RESERVED.has(key) ? rest : to)[key] = value;
	}
	return (Object.keys(to).length === 0 ? { ...props } : { ...rest, to }) as T & { to?: object };
}
