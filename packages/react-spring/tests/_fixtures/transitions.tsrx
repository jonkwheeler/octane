import { animated, useTransition } from '@octanejs/react-spring';

export function TransitionFixture(props) @{
	const transitions = useTransition(props.items, {
		keys: (item: any) => item.id,
		from: { opacity: 0 },
		enter: { opacity: 1 },
		leave: { opacity: 0 },
		immediate: true,
	});
	<div id="transition-list">{transitions(
		(styles: any, item: any, transition: any) =>
			<animated.div
				key={transition.key}
				data-key={transition.key}
				data-phase={transition.phase}
				style={styles}
			>{item.label}</animated.div>,
	)}</div>
}
