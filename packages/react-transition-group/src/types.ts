import type { ComponentBody, ElementDescriptor, OctaneNode } from 'octane';

export type TransitionStatus = 'unmounted' | 'exited' | 'entering' | 'entered' | 'exiting';
export type TransitionTimeout = number | { appear?: number; enter?: number; exit?: number };
export type TransitionNodeRef = { current: Element | null };

export interface TransitionCallbacks {
	onEnter?: (node?: Element, isAppearing?: boolean) => void;
	onEntering?: (node?: Element, isAppearing?: boolean) => void;
	onEntered?: (node?: Element, isAppearing?: boolean) => void;
	onExit?: (node?: Element) => void;
	onExiting?: (node?: Element) => void;
	onExited?: (node?: Element) => void;
}

export interface TransitionProps extends TransitionCallbacks {
	children:
		OctaneNode | ((status: TransitionStatus, childProps: Record<string, unknown>) => OctaneNode);
	in?: boolean;
	mountOnEnter?: boolean;
	unmountOnExit?: boolean;
	appear?: boolean;
	enter?: boolean;
	exit?: boolean;
	timeout?: TransitionTimeout;
	addEndListener?: ((done: () => void) => void) | ((node: Element, done: () => void) => void);
	nodeRef?: TransitionNodeRef;
	[key: string]: unknown;
}

export type TransitionComponent = ComponentBody<TransitionProps> & {
	UNMOUNTED: 'unmounted';
	EXITED: 'exited';
	ENTERING: 'entering';
	ENTERED: 'entered';
	EXITING: 'exiting';
};

export type CSSClassNames =
	| string
	| {
			appear?: string;
			appearActive?: string;
			appearDone?: string;
			enter?: string;
			enterActive?: string;
			enterDone?: string;
			exit?: string;
			exitActive?: string;
			exitDone?: string;
	  };

export interface CSSTransitionProps extends TransitionProps {
	classNames?: CSSClassNames;
}

export interface TransitionGroupProps {
	children?: OctaneNode;
	component?: ComponentBody<any> | string | null;
	childFactory?: (child: ElementDescriptor) => ElementDescriptor;
	appear?: boolean;
	enter?: boolean;
	exit?: boolean;
	[key: string]: unknown;
}

export interface SwitchTransitionProps {
	children?: ElementDescriptor | null;
	mode?: 'out-in' | 'in-out';
}

export interface ReplaceTransitionProps extends TransitionCallbacks {
	children: OctaneNode;
	in: boolean;
	[key: string]: unknown;
}
