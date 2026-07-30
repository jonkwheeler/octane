import { animated, SpringContext, useSpring, useTrail } from '@octanejs/react-spring';

export function SpringHookFixture(props) @{
	props.onRender();
	const [styles, api] = useSpring(
		() => ({
			from: { x: 0, opacity: 0 },
			to: { x: props.x, opacity: 1 },
			immediate: true,
		}),
		[props.x],
	);
	props.onReady(api);
	<animated.div
		id="hook-spring"
		style={{ left: styles.x, opacity: styles.opacity }}
	>{'spring'}</animated.div>
}

export function TrailHookFixture(props) @{
	const [styles] = useTrail(2, {
		from: { x: 0 },
		to: { x: 1 },
		immediate: true,
		delay: props.delay,
	});
	props.onReady(styles);
	<div>{'trail'}</div>
}

function ContextSpringChild(props) @{
	const [styles] = useSpring({
		from: { x: 0 },
		to: { x: 1 },
	});
	props.onReady(styles);
	<div>{'context spring'}</div>
}

export function ContextSpringFixture(props) @{
	<SpringContext immediate={true} pause={props.pause}>
		<ContextSpringChild onReady={props.onReady} />
	</SpringContext>
}
