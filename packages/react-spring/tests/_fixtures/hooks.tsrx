import { animated, useSpring } from '@octanejs/react-spring';

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
	<animated.div id="hook-spring" style={{ left: styles.x, opacity: styles.opacity }}>
		{'spring'}
	</animated.div>
}
