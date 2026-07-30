// Behavioral port of React Spring v10.1.2 browser hooks.
import { useLayoutEffect, useState } from 'octane';
import { SpringValue, type ControllerUpdate } from './engine';

type ElementRef<T> = { current: T | null };
const browserSubCache = new Map<symbol, Map<string, symbol>>();

function browserSub(slot: symbol | undefined, tag: string): symbol | undefined {
	if (slot === undefined) return undefined;
	let tags = browserSubCache.get(slot);
	if (tags === undefined) browserSubCache.set(slot, (tags = new Map()));
	let value = tags.get(tag);
	if (value === undefined) {
		value = Symbol.for(`${slot.description ?? 'react-spring-browser'}:${tag}`);
		tags.set(tag, value);
	}
	return value;
}

function browserSlot(args: any[]): symbol | undefined {
	const tail = args[args.length - 1];
	return typeof tail === 'symbol' ? tail : undefined;
}

function readScroll(target: Window | HTMLElement) {
	const element = target instanceof Window ? document.documentElement : target;
	const x = target instanceof Window ? target.scrollX : target.scrollLeft;
	const y = target instanceof Window ? target.scrollY : target.scrollTop;
	const width =
		target instanceof Window
			? element.scrollWidth - target.innerWidth
			: element.scrollWidth - element.clientWidth;
	const height =
		target instanceof Window
			? element.scrollHeight - target.innerHeight
			: element.scrollHeight - element.clientHeight;
	return {
		scrollX: x,
		scrollY: y,
		scrollXProgress: width > 0 ? x / width : 0,
		scrollYProgress: height > 0 ? y / height : 0,
	};
}

export function useScroll(
	optionsOrSlot: (ControllerUpdate<any> & { container?: ElementRef<HTMLElement> }) | symbol = {},
	...args: any[]
) {
	const slot = typeof optionsOrSlot === 'symbol' ? optionsOrSlot : browserSlot(args);
	const options = typeof optionsOrSlot === 'symbol' ? {} : optionsOrSlot;
	const [values] = useState(
		() => ({
			scrollX: new SpringValue(0),
			scrollY: new SpringValue(0),
			scrollXProgress: new SpringValue(0),
			scrollYProgress: new SpringValue(0),
		}),
		browserSub(slot, 'scroll-values'),
	);
	useLayoutEffect(
		() => {
			if (typeof window === 'undefined') return;
			const target = options.container?.current ?? window;
			const update = () => {
				const next = readScroll(target);
				for (const key of Object.keys(next) as Array<keyof typeof next>) {
					void values[key].start({
						to: next[key],
						config: typeof options.config === 'function' ? options.config(key) : options.config,
						immediate:
							typeof options.immediate === 'function' ? options.immediate(key) : options.immediate,
					});
				}
			};
			update();
			target.addEventListener('scroll', update, { passive: true });
			return () => {
				target.removeEventListener('scroll', update);
				Object.values(values).forEach((value) => value.stop(true));
			};
		},
		[options.container?.current],
		browserSub(slot, 'scroll-effect'),
	);
	return values;
}

export function useResize(
	optionsOrSlot: (ControllerUpdate<any> & { container?: ElementRef<HTMLElement> }) | symbol = {},
	...args: any[]
) {
	const slot = typeof optionsOrSlot === 'symbol' ? optionsOrSlot : browserSlot(args);
	const options = typeof optionsOrSlot === 'symbol' ? {} : optionsOrSlot;
	const [values] = useState(
		() => ({
			width: new SpringValue(0),
			height: new SpringValue(0),
		}),
		browserSub(slot, 'resize-values'),
	);
	useLayoutEffect(
		() => {
			if (typeof window === 'undefined') return;
			const element = options.container?.current;
			const update = (width: number, height: number) => {
				void values.width.start({ to: width, immediate: options.immediate as boolean });
				void values.height.start({ to: height, immediate: options.immediate as boolean });
			};
			if (element === undefined || element === null) {
				const onResize = () => update(window.innerWidth, window.innerHeight);
				onResize();
				window.addEventListener('resize', onResize);
				return () => window.removeEventListener('resize', onResize);
			}
			const rect = element.getBoundingClientRect();
			update(rect.width, rect.height);
			if (typeof ResizeObserver === 'undefined') return;
			const observer = new ResizeObserver(([entry]) => {
				if (entry !== undefined) update(entry.contentRect.width, entry.contentRect.height);
			});
			observer.observe(element);
			return () => {
				observer.disconnect();
				values.width.stop(true);
				values.height.stop(true);
			};
		},
		[options.container?.current],
		browserSub(slot, 'resize-effect'),
	);
	return values;
}

export interface InViewOptions extends Omit<IntersectionObserverInit, 'root' | 'threshold'> {
	root?: ElementRef<HTMLElement>;
	once?: boolean;
	amount?: 'any' | 'all' | number | number[];
}

export function useInView(
	optionsOrSlot: InViewOptions | symbol = {},
	...args: any[]
): [ElementRef<Element>, boolean] {
	const slot = typeof optionsOrSlot === 'symbol' ? optionsOrSlot : browserSlot(args);
	const options = typeof optionsOrSlot === 'symbol' ? {} : optionsOrSlot;
	const [ref] = useState<ElementRef<Element>>(
		() => ({ current: null }),
		browserSub(slot, 'in-view-ref'),
	);
	const [inView, setInView] = useState(false, browserSub(slot, 'in-view-value'));
	useLayoutEffect(
		() => {
			if (
				typeof IntersectionObserver === 'undefined' ||
				ref.current === null ||
				(options.once && inView)
			) {
				return;
			}
			const { amount = 'any', once, root, ...observerOptions } = options;
			const threshold = amount === 'any' ? 0 : amount === 'all' ? 1 : amount;
			const observer = new IntersectionObserver(
				([entry]) => {
					if (entry === undefined) return;
					setInView(entry.isIntersecting);
					if (entry.isIntersecting && once) observer.disconnect();
				},
				{ ...observerOptions, root: root?.current ?? null, threshold },
			);
			observer.observe(ref.current);
			return () => observer.disconnect();
		},
		[ref.current, options.root?.current, options.once, options.amount, options.rootMargin],
		browserSub(slot, 'in-view-effect'),
	);
	return [ref, inView];
}

export function useReducedMotion(...args: any[]): boolean | null {
	const slot = browserSlot(args);
	const [reduced, setReduced] = useState<boolean | null>(
		() =>
			typeof window === 'undefined' || typeof window.matchMedia !== 'function'
				? null
				: window.matchMedia('(prefers-reduced-motion)').matches,
		browserSub(slot, 'reduced-value'),
	);
	useLayoutEffect(
		() => {
			if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
			const query = window.matchMedia('(prefers-reduced-motion)');
			const update = () => setReduced(query.matches);
			update();
			query.addEventListener('change', update);
			return () => query.removeEventListener('change', update);
		},
		[],
		browserSub(slot, 'reduced-effect'),
	);
	return reduced;
}
