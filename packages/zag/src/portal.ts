import { Children, createElement, createPortal, Fragment, isChildrenBlock } from 'octane';
import type { OctaneNode } from 'octane';

export interface PortalProps {
	disabled?: boolean | undefined;
	container?: { current: HTMLElement | null } | undefined;
	getRootNode?: (() => ShadowRoot | Document | Node) | undefined;
	children?: OctaneNode;
}

export const Portal = (props: PortalProps) => {
	const { children, container, disabled, getRootNode } = props;

	if (typeof window === 'undefined' || disabled) {
		return createElement(Fragment, null, children);
	}

	const doc = getRootNode?.().ownerDocument ?? document;
	const mountNode = container?.current ?? doc.body;
	if (isChildrenBlock(children)) {
		return createPortal(children, mountNode);
	}
	const portals = Children.map(children, (child) => createPortal(child, mountNode));
	return createElement(Fragment, null, portals);
};
