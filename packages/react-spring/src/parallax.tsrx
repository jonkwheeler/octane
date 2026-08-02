// Behavioral Octane port of @react-spring/parallax v10.1.2.
import { createContext, useContext, useImperativeHandle, useLayoutEffect, useState } from 'octane';

export interface IParallax {
	readonly current: number;
	readonly busy: boolean;
	scrollTo(offset: number): void;
	update(): void;
	stop(): void;
}

interface LayerRegistration {
	node: HTMLElement;
	offset: number;
	speed: number;
	factor: number;
	sticky?: { start: number; end: number };
}

interface ParallaxContextValue {
	container: { current: HTMLElement | null };
	horizontal: boolean;
	enabled: boolean;
	space: number;
	layers: Set<LayerRegistration>;
	update(): void;
}

const ParallaxContext = createContext<ParallaxContextValue | null>(null);

function positionLayer(context: ParallaxContextValue, layer: LayerRegistration): void {
	const container = context.container.current;
	if (container === null) return;
	const scroll = context.horizontal ? container.scrollLeft : container.scrollTop;
	const page =
		context.space > 0 ? scroll / context.space : 0;
	let position = layer.offset * context.space - scroll * layer.speed;
	if (layer.sticky !== undefined) {
		const start = layer.sticky.start;
		const end = layer.sticky.end;
		position = page < start
			? start * context.space - scroll
			: page > end
				? end * context.space - scroll
				: 0;
	}
	layer.node.style.transform = context.horizontal
		? `translate3d(${position}px,0,0)`
		: `translate3d(0,${position}px,0)`;
	layer.node.style.width = context.horizontal ? `${layer.factor * context.space}px` : '100%';
	layer.node.style.height = context.horizontal ? '100%' : `${layer.factor * context.space}px`;
}

export function Parallax(props: any) @{
	const [container] = useState<{ current: HTMLElement | null }>(() => ({ current: null }));
	const [context] = useState<ParallaxContextValue>(
		() => ({
			container,
			horizontal: Boolean(props.horizontal),
			enabled: props.enabled !== false,
			space: 0,
			layers: new Set(),
			update() {
				const node = container.current;
				if (node === null) return;
				context.space = context.horizontal ? node.clientWidth : node.clientHeight;
				for (const layer of context.layers) positionLayer(context, layer);
			},
		}),
	);
	context.horizontal = Boolean(props.horizontal);
	context.enabled = props.enabled !== false;

	const [api] = useState<IParallax>(
		() => ({
			current: 0,
			busy: false,
			scrollTo(offset: number) {
				const node = container.current;
				if (node === null || !context.enabled) return;
				const next = offset * context.space;
				if (context.horizontal) node.scrollLeft = next;
				else node.scrollTop = next;
				(api as any).current = offset;
				context.update();
			},
			update: () => context.update(),
			stop() {
				(api as any).busy = false;
			},
		}),
	);
	useImperativeHandle(props.ref, () => api, []);
	useLayoutEffect(() => {
		const node = container.current;
		if (node === null) return;
		const update = () => {
			if (!context.enabled) return;
			(api as any).current = (context.horizontal ? node.scrollLeft : node.scrollTop) /
			Math.max(1, context.space);
			context.update();
		};
		update();
		node.addEventListener('scroll', update, { passive: true });
		const observer =
			typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => context.update());
		observer?.observe(node);
		return () => {
			node.removeEventListener('scroll', update);
			observer?.disconnect();
			api.stop();
		};
	}, [context.horizontal, context.enabled]);

	const axisStyle = context.horizontal
		? { width: `${props.pages * 100}%`, height: '100%' }
		: { width: '100%', height: `${props.pages * 100}%` };
	<ParallaxContext value={context}>
		<div
			{...props}
			ref={container}
			style={{
				position: 'relative',
				overflow: context.enabled ? 'auto' : 'hidden',
				width: '100%',
				height: '100%',
				...props.style,
			}}
		>
			<div style={{ position: 'absolute', ...axisStyle }}>{props.children}</div>
		</div>
	</ParallaxContext>
}

export function ParallaxLayer(props: any) @{
	const context = useContext(ParallaxContext);
	if (context === null) throw new Error('ParallaxLayer must be rendered inside Parallax');
	const [node] = useState<{ current: HTMLElement | null }>(() => ({ current: null }));
	useLayoutEffect(() => {
		if (node.current === null) return;
		const layer: LayerRegistration = {
			node: node.current,
			offset: props.offset ?? 0,
			speed: props.speed ?? 0,
			factor: props.factor ?? 1,
			sticky: props.sticky,
		};
		context.layers.add(layer);
		context.update();
		return () => {
			context.layers.delete(layer);
		};
	}, [props.offset, props.speed, props.factor, props.sticky]);
	<div
		{...props}
		ref={node}
		style={{
			position: 'absolute',
			inset: 0,
			willChange: 'transform',
			...props.style,
		}}
	>{props.children}</div>
}
