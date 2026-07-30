// Behavioral port of react-spring/packages/core and packages/animated at v10.1.2.
import { raf } from '@react-spring/rafz';

export interface AnimationResult<T> {
	value: T;
	finished: boolean;
	cancelled: boolean;
	noop?: boolean;
}

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

export interface SpringUpdate<T> {
	to: T;
	from?: T;
	config?: SpringConfig;
	immediate?: boolean;
	reset?: boolean;
	onStart?: (result: AnimationResult<T>, value: SpringValue<T>) => void;
	onChange?: (value: T, valueRef: SpringValue<T>) => void;
	onRest?: (result: AnimationResult<T>, value: SpringValue<T>) => void;
	onResolve?: (result: AnimationResult<T>, value: SpringValue<T>) => void;
}

type ChangeListener<T> = (value: T) => void;

export const config = {
	default: { tension: 170, friction: 26 },
	gentle: { tension: 120, friction: 14 },
	wobbly: { tension: 180, friction: 12 },
	stiff: { tension: 210, friction: 20 },
	slow: { tension: 280, friction: 60 },
	molasses: { tension: 280, friction: 120 },
} as const;

function asUpdate<T>(update: T | SpringUpdate<T>): SpringUpdate<T> {
	return typeof update === 'object' && update !== null && 'to' in update
		? (update as SpringUpdate<T>)
		: { to: update as T };
}

export class SpringValue<T = number> {
	private value: T;
	private listeners = new Set<ChangeListener<T>>();
	private velocity = 0;
	private frame: ((dt: number) => boolean | void) | undefined;
	private resolve: ((result: AnimationResult<T>) => void) | undefined;
	private update: SpringUpdate<T> | undefined;
	idle = true;

	constructor(value: T) {
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

	onChange(listener: ChangeListener<T>): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	start(update: T | SpringUpdate<T>): Promise<AnimationResult<T>> {
		const props = asUpdate(update);
		const wasIdle = this.idle;
		this.stop(true);
		if (props.reset && props.from !== undefined) this.setValue(props.from);
		else if (props.from !== undefined && wasIdle) this.setValue(props.from);
		this.update = props;
		this.velocity = props.config?.velocity ?? 0;
		this.idle = false;

		return new Promise((resolve) => {
			this.resolve = resolve;
			const target = props.to;
			const immediate =
				props.immediate ||
				typeof this.value !== 'number' ||
				typeof target !== 'number' ||
				Object.is(this.value, target);
			props.onStart?.(
				{
					value: this.value,
					finished: immediate,
					cancelled: false,
					noop: Object.is(this.value, target),
				},
				this,
			);
			if (immediate) {
				this.setValue(target);
				this.finish({ value: target, finished: true, cancelled: false, noop: true });
				return;
			}

			let elapsed = 0;
			const from = this.value as number;
			const frame = (dt: number) => {
				const active = this.update;
				if (active === undefined) return false;
				const options = { ...config.default, ...active.config };
				let next: number;
				let done: boolean;
				if (options.duration !== undefined) {
					elapsed += dt || 16.667;
					const progress = Math.min(1, elapsed / Math.max(1, options.duration));
					next =
						from +
						((active.to as number) - from) *
							(options.easing === undefined ? progress : options.easing(progress));
					done = progress >= 1;
				} else {
					const step = Math.min(64, dt || 16.667) / 1000;
					const displacement = (active.to as number) - (this.value as number);
					const acceleration =
						(options.tension * displacement - options.friction * this.velocity) /
						(options.mass ?? 1);
					this.velocity += acceleration * step;
					next = (this.value as number) + this.velocity * step;
					const precision = options.precision ?? 0.01;
					done = Math.abs(this.velocity) <= precision && Math.abs(displacement) <= precision;
					if (
						options.clamp &&
						Math.sign((active.to as number) - next) !== Math.sign(displacement)
					) {
						done = true;
					}
				}
				if (done) next = active.to as number;
				this.setValue(next as T);
				active.onChange?.(this.value, this);
				if (done) {
					this.finish({ value: this.value, finished: true, cancelled: false });
					return false;
				}
				return true;
			};
			this.frame = frame;
			raf(frame);
		});
	}

	stop(cancel = false): this {
		if (this.frame !== undefined) raf.cancel(this.frame);
		if (this.update !== undefined) {
			this.finish({ value: this.value, finished: !cancel, cancelled: cancel });
		}
		return this;
	}

	private setValue(value: T): void {
		if (Object.is(value, this.value)) return;
		this.value = value;
		for (const listener of this.listeners) listener(value);
	}

	private finish(result: AnimationResult<T>): void {
		const update = this.update;
		const resolve = this.resolve;
		this.frame = undefined;
		this.resolve = undefined;
		this.update = undefined;
		this.idle = true;
		update?.onRest?.(result, this);
		update?.onResolve?.(result, this);
		resolve?.(result);
	}
}

export class Interpolation<T> {
	private listeners = new Set<ChangeListener<T>>();
	private cleanups: Array<() => void> = [];

	constructor(
		private readonly sources: SpringValue<any>[],
		private readonly calc: (...values: any[]) => T,
	) {
		this.cleanups = sources.map((source) =>
			source.onChange(() => {
				const value = this.get();
				for (const listener of this.listeners) listener(value);
			}),
		);
	}

	get(): T {
		return this.calc(...this.sources.map((source) => source.get()));
	}

	onChange(listener: ChangeListener<T>): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	dispose(): void {
		for (const cleanup of this.cleanups) cleanup();
		this.cleanups = [];
		this.listeners.clear();
	}
}

export function to<A, T>(source: SpringValue<A>, calc: (value: A) => T): Interpolation<T>;
export function to<T>(sources: SpringValue<any>[], calc: (...values: any[]) => T): Interpolation<T>;
export function to<T>(
	source: SpringValue<any> | SpringValue<any>[],
	calc: (...values: any[]) => T,
): Interpolation<T> {
	return new Interpolation(Array.isArray(source) ? source : [source], calc);
}

export const interpolate = to;

export interface ControllerUpdate<State extends Record<string, any>> {
	from?: Partial<State>;
	to?: Partial<State>;
	config?: SpringConfig | ((key: keyof State) => SpringConfig);
	immediate?: boolean | ((key: keyof State) => boolean);
	delay?: number;
}

export class Controller<State extends Record<string, any> = Record<string, any>> {
	springs: { [Key in keyof State]: SpringValue<State[Key]> } = {} as any;

	constructor(props: ControllerUpdate<State> = {}) {
		const initial = { ...props.from, ...(!props.from ? props.to : undefined) } as State;
		for (const key in initial) this.springs[key] = new SpringValue(initial[key]);
	}

	get(): State {
		const result: Record<string, any> = {};
		for (const key in this.springs) result[key] = this.springs[key].get();
		return result as State;
	}

	set(values: Partial<State>): this {
		for (const key in values) this.ensure(key, values[key] as State[typeof key]).set(values[key]!);
		return this;
	}

	async start(update: ControllerUpdate<State>): Promise<AnimationResult<State>> {
		if (update.delay !== undefined && update.delay > 0) {
			await new Promise<void>((resolve) => setTimeout(resolve, update.delay));
		}
		const from: Partial<State> = update.from ?? {};
		const target: Partial<State> = update.to ?? {};
		for (const key in from) {
			const typedKey = key as keyof State;
			this.ensure(typedKey, from[typedKey] as State[typeof typedKey]);
		}
		const results = await Promise.all(
			Object.keys(target).map((key) => {
				const typedKey = key as keyof State;
				const spring = this.ensure(typedKey, (from as any)[key] ?? (target as any)[key]);
				return spring.start({
					to: target[typedKey]!,
					from: from[typedKey],
					config: typeof update.config === 'function' ? update.config(typedKey) : update.config,
					immediate:
						typeof update.immediate === 'function' ? update.immediate(typedKey) : update.immediate,
				});
			}),
		);
		return {
			value: this.get(),
			finished: results.every((result) => result.finished),
			cancelled: results.some((result) => result.cancelled),
		};
	}

	stop(cancel = false): this {
		for (const key in this.springs) this.springs[key].stop(cancel);
		return this;
	}

	private ensure<Key extends keyof State>(key: Key, initial: State[Key]): SpringValue<State[Key]> {
		return (this.springs[key] ??= new SpringValue(initial));
	}
}

export class SpringRef<State extends Record<string, any> = Record<string, any>> {
	current: Controller<State>[] = [];

	add(controller: Controller<State>): void {
		if (!this.current.includes(controller)) this.current.push(controller);
	}

	delete(controller: Controller<State>): void {
		const index = this.current.indexOf(controller);
		if (index >= 0) this.current.splice(index, 1);
	}

	start(update?: ControllerUpdate<State>): Promise<AnimationResult<State>[]> {
		return Promise.all(this.current.map((controller) => controller.start(update ?? {})));
	}

	stop(cancel = false): void {
		for (const controller of this.current) controller.stop(cancel);
	}
}
