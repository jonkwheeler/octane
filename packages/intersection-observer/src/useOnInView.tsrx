import { useCallback, useRef } from 'octane';
import { observe } from './observe.js';
import type { IntersectionChangeEffect, IntersectionEffectOptions } from './types.js';

export function useOnInView(
	onChange: IntersectionChangeEffect,
	options: IntersectionEffectOptions | symbol = {},
) {
	options = typeof options === 'symbol' ? {} : options;
	const callback = useRef(onChange);
	callback.current = onChange;
	const unobserve = useRef<void | (() => void)>(undefined);
	const lastInView = useRef<boolean | undefined>(undefined);

	return useCallback((node: Element | null) => {
		unobserve.current?.();
		unobserve.current = undefined;
		lastInView.current = options.initialInView;
		if (!node || options.skip) return;
		unobserve.current = observe(
			node,
			(inView, entry) => {
				const previousInView = lastInView.current;
				lastInView.current = inView;
				if (previousInView === undefined && !inView) return;
				callback.current(inView, entry);
				if (inView && options.triggerOnce) {
					unobserve.current?.();
					unobserve.current = undefined;
					lastInView.current = undefined;
				}
			},
			{
				root: options.root,
				rootMargin: options.rootMargin,
				threshold: options.threshold,
				trackVisibility: options.trackVisibility,
				delay: options.delay,
				scrollMargin: options.scrollMargin,
			},
			options.fallbackInView,
		);
		return () => {
			unobserve.current?.();
			unobserve.current = undefined;
			lastInView.current = undefined;
		};
	}, [Array.isArray(options.threshold) ? options.threshold.toString() : options.threshold, options.root, options.rootMargin, options.triggerOnce, options.skip, options.trackVisibility, options.fallbackInView, options.delay, options.scrollMargin, options.initialInView]);
}
