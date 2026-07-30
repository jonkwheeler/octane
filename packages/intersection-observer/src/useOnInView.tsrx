import { useCallback, useEffect, useRef } from 'octane';
import { observe } from './observe.js';
import type { IntersectionChangeEffect, IntersectionEffectOptions } from './types.js';

export function useOnInView(
	onChange: IntersectionChangeEffect,
	options: IntersectionEffectOptions = {},
) {
	const callback = useRef(onChange);
	const unobserve = useRef<void | (() => void)>(undefined);
	const effectCleanup = useRef<void | (() => void)>(undefined);
	const lastInView = useRef(options.initialInView);

	useEffect(() => {
		callback.current = onChange;
	}, [onChange]);

	return useCallback((node: Element | null) => {
		unobserve.current?.();
		unobserve.current = undefined;
		effectCleanup.current?.();
		effectCleanup.current = undefined;
		if (!node || options.skip) return;
		unobserve.current = observe(
			node,
			(inView, entry) => {
				if (lastInView.current === undefined && !inView) return;
				lastInView.current = inView;
				effectCleanup.current?.();
				effectCleanup.current = callback.current(inView, entry);
				if (entry.isIntersecting && options.triggerOnce) {
					unobserve.current?.();
					unobserve.current = undefined;
				}
			},
			options,
			options.fallbackInView,
		);
		return () => {
			unobserve.current?.();
			unobserve.current = undefined;
			effectCleanup.current?.();
			effectCleanup.current = undefined;
		};
	}, [Array.isArray(options.threshold) ? options.threshold.toString() : options.threshold, options.root, options.rootMargin, options.triggerOnce, options.skip, options.trackVisibility, options.fallbackInView, options.delay, options.scrollMargin]);
}
