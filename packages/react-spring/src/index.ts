import { raf } from '@react-spring/rafz';
import { hostComponent, useLayoutEffect, useState } from 'octane';
import { SpringValue } from './engine';

export * from './engine';
export * from './hooks';
export * from './browser';
export * from './upstream-compat';
export { FrameValue } from './core/FrameValue';
export type { SpringContextValue } from './context';
export { Spring, SpringContext, Trail, Transition } from './components.tsrx';

const HOST_STATE = Symbol.for('octane-react-spring:animated-host-state');
const HOST_EFFECT = Symbol.for('octane-react-spring:animated-host-effect');

function isSpringValue(value: unknown): value is SpringValue<unknown> {
	return value instanceof SpringValue;
}

function styleValue(key: string, value: unknown): string {
	if (typeof value !== 'number') return String(value ?? '');
	if (
		value === 0 ||
		key === 'opacity' ||
		key === 'zIndex' ||
		key === 'fontWeight' ||
		key === 'lineHeight' ||
		key.startsWith('--')
	) {
		return String(value);
	}
	return `${value}px`;
}

function splitProps(props: Record<string, any>) {
	const hostProps: Record<string, any> = {};
	const fluids: Array<[string, SpringValue<unknown>]> = [];
	for (const key in props) {
		if (key !== 'style') {
			hostProps[key] = props[key];
			continue;
		}
		const style: Record<string, any> = {};
		for (const styleKey in props.style ?? {}) {
			const value = props.style[styleKey];
			if (isSpringValue(value)) {
				fluids.push([styleKey, value]);
				style[styleKey] = styleValue(styleKey, value.get());
			} else {
				style[styleKey] = value;
			}
		}
		hostProps.style = style;
	}
	return { hostProps, fluids };
}

function createAnimatedComponent(tag: string) {
	return function AnimatedComponent(props: Record<string, any>, scope: any): void {
		const { hostProps, fluids } = splitProps(props);
		const node = hostComponent(scope, 0, tag, hostProps, props.children) as HTMLElement;
		const [state] = useState(
			() => ({ node, fluids, pending: false, cancelled: false }),
			HOST_STATE,
		);
		state.node = node;
		state.fluids = fluids;
		state.cancelled = false;

		useLayoutEffect(
			() => {
				const apply = () => {
					state.pending = false;
					if (state.cancelled) return;
					for (const [key, value] of state.fluids) {
						(state.node.style as any)[key] = styleValue(key, value.get());
					}
				};
				const schedule = () => {
					if (state.pending) return;
					state.pending = true;
					raf.write(apply);
				};
				const cleanups = state.fluids.map(([, value]) => value.onChange(schedule));
				apply();
				return () => {
					state.cancelled = true;
					state.pending = false;
					for (const cleanup of cleanups) cleanup();
					raf.cancel(apply);
				};
			},
			fluids.map(([, value]) => value),
			HOST_EFFECT,
		);
	};
}

const animatedCache = new Map<string, ReturnType<typeof createAnimatedComponent>>();

export const animated = new Proxy(createAnimatedComponent as any, {
	apply(_target, _thisArg, args: [any]) {
		if (typeof args[0] === 'string') return createAnimatedComponent(args[0]);
		return args[0];
	},
	get(_target, key) {
		if (typeof key !== 'string') return undefined;
		let component = animatedCache.get(key);
		if (component === undefined) {
			component = createAnimatedComponent(key);
			animatedCache.set(key, component);
		}
		return component;
	},
}) as typeof createAnimatedComponent & Record<string, ReturnType<typeof createAnimatedComponent>>;

export const a = animated;
