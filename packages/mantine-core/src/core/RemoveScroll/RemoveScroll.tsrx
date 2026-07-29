import type { OctaneNode } from 'octane';
import { cloneElement, isValidElement, useLayoutEffect } from 'octane';

export interface RemoveScrollProps {
	children: OctaneNode;
	enabled?: boolean;
	removeScrollBar?: boolean;
	forwardProps?: boolean;
	as?: string | ((props: any) => any);
	className?: string;
	style?: React.CSSProperties;
	ref?: OctaneRef<HTMLElement>;
	[key: string]: any;
}

let activeLocks = 0;
let originalOverflow = '';
let originalPaddingRight = '';

function lockBody(removeScrollBar: boolean) {
	if (activeLocks++ > 0) return;
	const body = document.body;
	originalOverflow = body.style.overflow;
	originalPaddingRight = body.style.paddingRight;

	if (removeScrollBar) {
		const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
		body.style.paddingRight = scrollbarWidth > 0 ? `${scrollbarWidth}px` : originalPaddingRight;
	}
	body.style.overflow = 'hidden';
}

function unlockBody() {
	activeLocks = Math.max(0, activeLocks - 1);
	if (activeLocks !== 0) return;
	document.body.style.overflow = originalOverflow;
	document.body.style.paddingRight = originalPaddingRight;
}

export function RemoveScroll({
	children,
	enabled = true,
	removeScrollBar = true,
	forwardProps = false,
	as: Component = 'div',
	...props
}: RemoveScrollProps) {
	useLayoutEffect(() => {
		if (!enabled || typeof document === 'undefined') return;
		lockBody(removeScrollBar);
		return unlockBody;
	}, [enabled, removeScrollBar]);

	if (forwardProps && isValidElement(children)) {
		return cloneElement(children, props);
	}

	return <Component {...props}>{children}</Component>;
}

RemoveScroll.classNames = {
	fullWidth: 'width-before-scroll-bar',
	zeroRight: 'right-scroll-bar-position',
};
