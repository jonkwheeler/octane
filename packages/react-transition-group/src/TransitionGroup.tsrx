import { createElement, useLayoutEffect, useRef, useState, type ElementDescriptor } from 'octane';
import TransitionGroupContext from './TransitionGroupContext.ts';
import type { TransitionGroupProps } from './types.ts';
import {
	getChildMapping,
	getInitialChildMapping,
	getNextChildMapping,
	type ChildMapping,
} from './utils/ChildMapping.ts';

export function TransitionGroup(props: TransitionGroupProps) @{
	const mounted = useRef(false);
	const first = useRef(true);
	const previousChildren = useRef<ChildMapping>({});
	const mapping = useRef<ChildMapping>({});
	const observedChildren = useRef(false);
	const [, rerender] = useState(0);

	const handleExited = (child: ElementDescriptor, node?: Element) => {
		if (String(child.key) in previousChildren.current) return;
		(child.props.onExited as ((node?: Element) => void) | undefined)?.(node);
		if (mounted.current) {
			delete mapping.current[String(child.key)];
			rerender((value) => value + 1);
		}
	};

	if (first.current) {
		mapping.current = getInitialChildMapping(props, handleExited);
		previousChildren.current = getChildMapping(props.children);
		first.current = false;
	}

	useLayoutEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);

	useLayoutEffect(() => {
		if (!observedChildren.current) {
			observedChildren.current = true;
			return;
		}
		const nextChildren = getChildMapping(props.children);
		mapping.current = getNextChildMapping(props, mapping.current, handleExited);
		previousChildren.current = nextChildren;
		rerender((value) => value + 1);
	}, [props.children]);

	const {
		children: _children,
		component = 'div',
		childFactory = (child: ElementDescriptor) => child,
		appear: _appear,
		enter: _enter,
		exit: _exit,
		...wrapperProps
	} = props;
	const renderedChildren = Object.values(mapping.current).map(childFactory);
	const output =
		component === null
			? renderedChildren
			: createElement(component, wrapperProps, ...renderedChildren);

	<TransitionGroupContext.Provider
		value={{ isMounting: !mounted.current }}
	>{output}</TransitionGroupContext.Provider>
}

export default TransitionGroup;
