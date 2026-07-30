import { isChildrenBlock } from 'octane';
import { SpringContext as SpringContextObject, type SpringContextValue } from './context';
import { useSpring, useTrail, useTransition } from './hooks';

export function SpringContext(props: SpringContextValue & { children?: unknown }) @{
	const { children, ...value } = props;
	<SpringContextObject value={value}>{children}</SpringContextObject>
}

export function Spring(props: any) @{
	const { children, ...update } = props;
	const [styles] = useSpring(update);
	<>
		{typeof children === 'function' && !isChildrenBlock(children) ? children(styles) : children}
	</>
}

export function Trail(props: any) @{
	const { children, items = [], ...update } = props;
	const [styles] = useTrail(items.length, update);
	<>
		{typeof children === 'function' && !isChildrenBlock(children)
			? items.map((item: any, index: number) => children(item)(styles[index]))
			: children}
	</>
}

export function Transition(props: any) @{
	const { children, items = [], ...update } = props;
	const transitions = useTransition(items, update);
	<>
		{typeof children === 'function' && !isChildrenBlock(children)
			? transitions((styles: any, item: any) => children(item)(styles))
			: children}
	</>
}
