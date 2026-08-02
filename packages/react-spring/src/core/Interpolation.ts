// React-free behavioral port of react-spring v10.1.2 packages/core/src/Interpolation.ts.
import { createInterpolator } from '../shared/index';
import type { InterpolatorConfig } from '../types/index';
import { FrameValue } from './FrameValue';

export class Interpolation<T> extends FrameValue<T> {
	private readonly cleanups: Array<() => void>;
	constructor(
		private readonly sources: Array<FrameValue<any>>,
		private readonly calc: (...values: any[]) => T,
	) {
		super();
		this.idle = sources.every((source) => source.idle);
		this.cleanups = sources.map((source) =>
			source.onChange(() => {
				this.idle = this.sources.every((parent) => parent.idle);
				this.emitChange(this.get());
			}),
		);
	}
	get(): T {
		return this.calc(...this.sources.map((source) => source.get()));
	}
	dispose(): void {
		for (const cleanup of this.cleanups) cleanup();
		this.cleanups.length = 0;
		this.listeners.clear();
		this.idle = true;
	}
}

export function to<A, T>(source: FrameValue<A>, calc: (value: A) => T): Interpolation<T>;
export function to<T>(
	sources: Array<FrameValue<any>>,
	calc: (...values: any[]) => T,
): Interpolation<T>;
export function to<T>(source: FrameValue<number>, config: InterpolatorConfig<T>): Interpolation<T>;
export function to<T>(
	source: FrameValue<any> | Array<FrameValue<any>>,
	calc: ((...values: any[]) => T) | InterpolatorConfig<T>,
): Interpolation<T> {
	const interpolate = typeof calc === 'function' ? calc : createInterpolator(calc);
	return new Interpolation(Array.isArray(source) ? source : [source], interpolate);
}

export const interpolate = to;
