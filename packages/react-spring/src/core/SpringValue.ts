// React-free behavioral port of react-spring v10.1.2 packages/core/src/SpringValue.ts.
import { raf } from '@react-spring/rafz';
import {
	type AnimationResult,
	getCancelledResult,
	getFinishedResult,
	getNoopResult,
} from './AnimationResult';
import { FrameValue } from './FrameValue';

export interface SpringConfig {
	mass?: number;
	tension?: number;
	friction?: number;
	precision?: number;
	velocity?: number;
	clamp?: boolean;
	duration?: number;
	easing?: (value: number) => number;
}

export type LoopProp<T> = boolean | (() => boolean | Partial<SpringUpdate<T>>);

export interface SpringUpdate<T> {
	to: T;
	from?: T;
	config?: SpringConfig;
	delay?: number;
	immediate?: boolean;
	reset?: boolean;
	pause?: boolean;
	cancel?: boolean;
	loop?: LoopProp<T>;
	onStart?: (result: AnimationResult<T>, value: SpringValue<T>) => void;
	onChange?: (value: T, valueRef: SpringValue<T>) => void;
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

	constructor(value: T) {
		super();
		this.value = value;
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
		this.stop(true);
		this.paused = props.pause === true;
		return new Promise((resolve) => {
			const active: Active<T> = { props, resolve, started: false, settled: false };
			this.active = active;
			this.idle = false;
			const begin = () => {
				active.timer = undefined;
				if (this.active !== active || active.settled) return;
				this.run(active);
			};
			if ((props.delay ?? 0) > 0) active.timer = setTimeout(begin, props.delay);
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
		if (props.reset && props.from !== undefined) this.setValue(props.from);
		else if (props.from !== undefined) this.setValue(props.from);
		active.started = true;
		this.velocity = props.config?.velocity ?? 0;
		const target = props.to;
		const immediate =
			props.immediate === true ||
			typeof this.value !== 'number' ||
			typeof target !== 'number' ||
			Object.is(this.value, target);
		props.onStart?.(
			Object.is(this.value, target)
				? getNoopResult(this.value)
				: getFinishedResult(this.value, false),
			this,
		);
		if (immediate) {
			this.setValue(target);
			props.onChange?.(this.value, this);
			void this.completeIteration(active);
			return;
		}
		let elapsed = 0;
		const from = this.value as number;
		active.frame = (dt) => {
			if (this.active !== active || active.settled) return false;
			if (this.paused) return true;
			const options = { ...config.default, ...props.config };
			let next: number;
			let done: boolean;
			if (options.duration !== undefined) {
				elapsed += dt || 16.667;
				const progress = Math.min(1, elapsed / Math.max(1, options.duration));
				next = from + ((target as number) - from) * (options.easing?.(progress) ?? progress);
				done = progress >= 1;
			} else {
				const step = Math.min(64, dt || 16.667) / 1000;
				const displacement = (target as number) - (this.value as number);
				this.velocity +=
					((options.tension * displacement - options.friction * this.velocity) /
						(options.mass ?? 1)) *
					step;
				next = (this.value as number) + this.velocity * step;
				const precision = options.precision ?? 0.01;
				done = Math.abs(this.velocity) <= precision && Math.abs(displacement) <= precision;
				if (options.clamp && Math.sign((target as number) - next) !== Math.sign(displacement))
					done = true;
			}
			if (done) next = target as number;
			this.setValue(next as T);
			props.onChange?.(this.value, this);
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
			active.props = {
				...active.props,
				...(typeof next === 'object' ? next : {}),
				loop,
				reset: true,
			};
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

function asUpdate<T>(update: T | SpringUpdate<T>): SpringUpdate<T> {
	return typeof update === 'object' && update !== null && 'to' in update
		? (update as SpringUpdate<T>)
		: { to: update as T };
}
