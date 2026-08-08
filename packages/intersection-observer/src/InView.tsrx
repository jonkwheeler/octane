import { createElement, isChildrenBlock } from 'octane';
import { useInView } from './useInView.tsrx';
import type { InViewProps, InViewRenderProps } from './types.js';

export function InView(props: InViewProps) {
	const {
		children,
		as = 'div',
		triggerOnce,
		skip,
		initialInView,
		fallbackInView,
		onChange,
		root,
		rootMargin,
		threshold,
		trackVisibility,
		delay,
		scrollMargin,
		...rest
	} = props;
	const result = useInView({
		triggerOnce,
		skip,
		initialInView,
		fallbackInView,
		onChange,
		root,
		rootMargin,
		threshold,
		trackVisibility,
		delay,
		scrollMargin,
	});
	const renderProps: InViewRenderProps = {
		ref: result.ref,
		inView: result.inView,
		entry: result.entry,
	};
	if (typeof children === 'function' && !isChildrenBlock(children)) return children(renderProps);
	const consumerRef = rest.ref;
	const { ref: _ignoredRef, ...domProps } = rest;
	const hostRef = consumerRef == null ? result.ref : [result.ref, consumerRef];
	return createElement(as, { ...domProps, ref: hostRef }, children);
}
