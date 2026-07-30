import { animated, SpringValue } from '@octanejs/react-spring';

export function AnimatedHostFixture(props) @{
	const x = new SpringValue(0);
	const y = new SpringValue(0);
	props.onReady({ x, y });
	<animated.div id="animated-host" style={{ left: x, top: y }}>{'spring'}</animated.div>
}
