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
		{children(styles)}
	</>
}

export function Trail(props: any) @{
	const { children, items = [], ...update } = props;
	const [styles] = useTrail(items.length, update);
	<>
		{items.map((item: any, index: number) => children(item)(styles[index]))}
	</>
}

export function Transition(props: any) @{
	const { children, items = [], ...update } = props;
	const transitions = useTransition(items, update);
	<>
		{transitions((styles: any, item: any) => children(item)(styles))}
	</>
}
