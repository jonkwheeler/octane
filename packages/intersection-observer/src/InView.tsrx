import { createElement } from 'octane';
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
	if (typeof children === 'function') return children(renderProps);
	return createElement(as, { ...rest, ref: result.ref }, children);
}
