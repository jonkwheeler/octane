import { provideContext } from 'octane';
import { SpringContext as SpringContextObject, type SpringContextValue } from './context';
import { useSpring, useTrail } from './hooks';

export function SpringContext(
	props: SpringContextValue & { children?: unknown },
	scope: any,
) @{
	const { children, ...value } = props;
	provideContext(scope, SpringContextObject, value);
	<>
		{children}
	</>
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
	const list = Array.isArray(items) ? items : [items];
	const [styles] = useTrail(list.length, update);
	<>
		{list.map((item: any, index: number) => children(item)(styles[index]))}
	</>
}
