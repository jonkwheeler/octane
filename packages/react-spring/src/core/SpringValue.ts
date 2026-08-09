// React-free behavioral port of react-spring v10.1.2 packages/core/src/SpringValue.ts.
import { raf } from '@react-spring/rafz';
import { Globals } from '../shared/globals';
import {
	type AnimationResult,
	getCancelledResult,
	getFinishedResult,
	getNoopResult,
} from './AnimationResult';
import { FrameValue } from './FrameValue';
import { interpolateValue, isAnimatable } from './valueInterpolation';

export interface SpringConfig {
	mass?: number;
	tension?: number;
	friction?: number;
	precision?: number;
	velocity?: number;
	restVelocity?: number;
	clamp?: boolean;
	frequency?: number;
	damping?: number;
	bounce?: number;
	decay?: boolean | number;
	round?: number;
	duration?: number;
	easing?: (value: number) => number;
}

export type LoopProp<T> = boolean | (() => boolean | Partial<SpringUpdate<T>>);

export interface SpringUpdate<T> {
	to?: T | FrameValue<T>;
	from?: T;
	config?: SpringConfig;
	delay?: number;
	immediate?: boolean;
	reset?: boolean;
	pause?: boolean;
	cancel?: boolean;
	loop?: LoopProp<T>;
	onStart?: (result: AnimationResult<T>, value: SpringValue<T>) => void;
	onChange?: (result: AnimationResult<T>, value: SpringValue<T>) => void;
	onPause?: (result: AnimationResult<T>, value: SpringValue<T>) => void;
	onResume?: (result: AnimationResult<T>, value: SpringValue<T>) => void;
	onRest?: (result: AnimationResult<T>, value: SpringValue<T>) => void;
	onResolve?: (result: AnimationResult<T>, value: SpringValue<T>) => void;
}

export const config = {
	default: { tension: 170, friction: 26 },
	gentle: { tension: 120, friction: 14 },
	wobbly: { tension: 180, friction: 12 },
	stiff: { tension: 210, friction: 20 },
	slow: { tension: 280, friction: 60 },
	molasses: { tension: 280, friction: 120 },
} as const;

interface Active<T> {
	props: SpringUpdate<T>;
	resolve: (result: AnimationResult<T>) => void;
	frame?: (dt: number) => boolean;
	timer?: ReturnType<typeof setTimeout>;
	started: boolean;
	settled: boolean;
}

export class SpringValue<T = number> extends FrameValue<T> {
	private value: T;
	private velocity = 0;
	private active?: Active<T>;
	private paused = false;
	private hasAnimated = false;

	constructor(from: T, props?: Omit<SpringUpdate<T>, 'to'> & { to?: T | FrameValue<T> });
	constructor(props?: SpringUpdate<T>);
	constructor(arg1?: any, arg2?: any) {
		super();
		if (arg1 === undefined && arg2 === undefined) {
			this.value = undefined as T;
			return;
		}
		const props =
			typeof arg1 === 'object' && arg1 !== null && !Array.isArray(arg1)
				? { ...(arg1 as SpringUpdate<T>) }
				: { ...(arg2 as SpringUpdate<T> | undefined), from: arg1 as T };
		this.value = (props.from ?? goal(props.to, undefined as T)) as T;
		if ((props as SpringUpdate<T> & { default?: boolean }).default === undefined) {
			(props as SpringUpdate<T> & { default?: boolean }).default = true;
		}
		void this.start(props);
	}
	get(): T {
		return this.value;
	}
	set(value: T): this {
		this.stop(false);
		this.setValue(value);
		return this;
	}
	start(update: T | SpringUpdate<T>): Promise<AnimationResult<T>> {
		const props = asUpdate(update);
		if (props.cancel) {
			this.stop(true);
			return Promise.resolve(getCancelledResult(this.value));
		}
		const nextGoal = goal(props.to, this.value);
		const active = this.active;
		if (
			active &&
			!active.settled &&
			!props.reset &&
			props.from === undefined &&
			Object.is(goal(active.props.to, this.value), nextGoal)
		) {
			const previousResolve = active.resolve;
			active.props = { ...active.props, ...props, to: active.props.to };
			return new Promise(function waitForActive(resolve) {
				active.resolve = function resolveBoth(result) {
					previousResolve(result);
					resolve(result);
				};
			});
		}
		this.stop(true);
		this.paused = props.pause === true;
		return new Promise((resolve) => {
			const next: Active<T> = { props, resolve, started: false, settled: false };
			this.active = next;
			this.idle = false;
			const begin = () => {
				next.timer = undefined;
				if (this.active !== next || next.settled) return;
				this.run(next);
			};
			if ((props.delay ?? 0) > 0) next.timer = setTimeout(begin, props.delay);
			else begin();
		});
	}
	pause(): this {
		if (!this.paused) {
			this.paused = true;
			const active = this.active;
			if (active?.started) active.props.onPause?.(getFinishedResult(this.value, false), this);
		}
		return this;
	}
	resume(): this {
		if (this.paused) {
			this.paused = false;
			const active = this.active;
			if (active?.started) active.props.onResume?.(getFinishedResult(this.value, false), this);
		}
		return this;
	}
	stop(cancel = false): this {
		const active = this.active;
		if (!active || active.settled) return this;
		if (active.timer) clearTimeout(active.timer);
		if (active.frame) raf.cancel(active.frame);
		const result = cancel ? getCancelledResult(this.value) : getFinishedResult(this.value, false);
		this.settle(active, result, active.started);
		return this;
	}

	private run(active: Active<T>): void {
		const props = active.props;
		// Upstream applies `from` only before the first animation or when `reset` is set.
		if (props.from !== undefined && (props.reset || !this.hasAnimated)) {
			this.setValue(props.from);
		}
		this.hasAnimated = true;
		active.started = true;
		this.velocity = props.config?.velocity ?? 0;
		const target = goal(props.to, this.value);
		const immediate =
			props.immediate === true ||
			Globals.skipAnimation ||
			!isAnimatable(this.value) ||
			!isAnimatable(target) ||
			Object.is(this.value, target);
		props.onStart?.(
			Object.is(this.value, target)
				? getNoopResult(this.value)
				: getFinishedResult(this.value, false),
			this,
		);
		if (immediate) {
			this.setValue(target);
			props.onChange?.(getFinishedResult(this.value, false), this);
			void this.completeIteration(active);
			return;
		}
		let elapsed = 0;
		const from = this.value;
		let progress = 0;
		const options = { mass: 1, damping: 1, ...config.default, ...props.config };
		if (options.frequency !== undefined) {
			const frequency = Math.max(0.01, options.frequency);
			options.tension = Math.pow((2 * Math.PI) / frequency, 2) * options.mass;
			options.friction = (4 * Math.PI * Math.max(0, options.damping) * options.mass) / frequency;
		}
		active.frame = (dt) => {
			if (this.active !== active || active.settled) return false;
			if (this.paused) return true;
			const currentTarget = goal(props.to, this.value);
			let next: number;
			let done: boolean;
			if (options.decay) {
				const decay = options.decay === true ? 0.998 : options.decay;
				const step = (dt || 16.667) / 16.667;
				this.velocity *= Math.pow(decay, step);
				next = (this.value as number) + this.velocity * step;
				done = Math.abs(this.velocity) <= (options.restVelocity ?? options.precision ?? 0.01);
			} else if (options.duration !== undefined) {
				elapsed += dt || 16.667;
				progress = Math.min(1, elapsed / Math.max(1, options.duration));
				next = options.easing?.(progress) ?? progress;
				done = progress >= 1;
			} else {
				const step = Math.min(64, dt || 16.667) / 1000;
				const displacement = 1 - progress;
				this.velocity +=
					((options.tension * displacement - options.friction * this.velocity) /
						(options.mass ?? 1)) *
					step;
				next = progress + this.velocity * step;
				const precision = options.precision ?? 0.01;
				done = Math.abs(this.velocity) <= precision && Math.abs(displacement) <= precision;
				if (next > 1 && options.bounce !== undefined) {
					next = 1;
					this.velocity *= -1 + options.bounce;
				} else if (options.clamp && Math.sign(1 - next) !== Math.sign(displacement)) done = true;
			}
			if (options.decay) {
				if (options.round) next = Math.round(next / options.round) * options.round;
				this.setValue(next as T);
			} else {
				progress = done ? 1 : next;
				let shaped = interpolateValue(from, currentTarget, progress);
				if (options.round && typeof shaped === 'number' && !done)
					shaped = (Math.round(shaped / options.round) * options.round) as T;
				this.setValue(done ? currentTarget : shaped);
			}
			props.onChange?.(getFinishedResult(this.value, false), this);
			if (done) {
				void this.completeIteration(active);
				return false;
			}
			return true;
		};
		raf(active.frame);
	}

	private async completeIteration(active: Active<T>): Promise<void> {
		const loop = active.props.loop;
		const next = typeof loop === 'function' ? loop() : loop;
		if (next && this.active === active && !active.settled) {
			const nextProps = {
				...active.props,
				...(typeof next === 'object' ? next : {}),
				loop,
				reset: true,
			};
			if (nextProps.from === undefined && Object.is(this.value, goal(nextProps.to, this.value))) {
				this.settle(active, getFinishedResult(this.value, true), true);
				return;
			}
			active.props = nextProps;
			this.run(active);
			return;
		}
		this.settle(active, getFinishedResult(this.value, true), true);
	}
	private settle(active: Active<T>, result: AnimationResult<T>, notifyRest: boolean): void {
		if (active.settled) return;
		active.settled = true;
		if (this.active === active) this.active = undefined;
		this.idle = true;
		if (notifyRest) active.props.onRest?.(result, this);
		active.props.onResolve?.(result, this);
		active.resolve(result);
	}
	private setValue(value: T): void {
		if (Object.is(value, this.value)) return;
		this.value = value;
		this.emitChange(value);
	}
}

function looksLikeSpringUpdate(value: object): boolean {
	return (
		'to' in value ||
		'from' in value ||
		'config' in value ||
		'delay' in value ||
		'immediate' in value ||
		'reset' in value ||
		'pause' in value ||
		'cancel' in value ||
		'loop' in value ||
		'onStart' in value ||
		'onChange' in value ||
		'onPause' in value ||
		'onResume' in value ||
		'onRest' in value ||
		'onResolve' in value ||
		'default' in value
	);
}

function asUpdate<T>(update: T | SpringUpdate<T>): SpringUpdate<T> {
	if (typeof update === 'object' && update !== null && !Array.isArray(update) && looksLikeSpringUpdate(update)) {
		return update as SpringUpdate<T>;
	}
	return { to: update as T };
}

function goal<T>(value: T | FrameValue<T> | undefined, fallback?: T): T {
	if (value === undefined) return fallback as T;
	return value instanceof FrameValue ? value.get() : value;
}
