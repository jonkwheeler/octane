import { animated, Spring } from '@octanejs/react-spring';

export function SpringComponentFixture() @{
	<Spring
		from={{ opacity: 0 }}
		to={{ opacity: 1 }}
		immediate={true}
		children={(styles: any) => (
			<animated.div id="spring-component" style={styles}>{'ready'}</animated.div>
		)}
	/>
}
