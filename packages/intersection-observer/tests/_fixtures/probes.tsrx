import { InView, useInView, useOnInView } from '@octanejs/intersection-observer';

const noopEffect = () => {};

export function HookProbe(props: {
	onChange?(inView: boolean, entry: IntersectionObserverEntry): void;
	triggerOnce?: boolean;
	initialInView?: boolean;
}) @{
	const { ref, inView, entry } = useInView(props);
	<div ref={ref} data-testid="target" data-entry={entry ? 'yes' : 'no'}>
		{inView ? 'visible' : 'hidden'}
	</div>
}

export function EffectProbe(props: {
	onChange(inView: boolean, entry: IntersectionObserverEntry): void;
}) @{
	const ref = useOnInView(props.onChange);
	<div ref={ref} data-testid="effect">effect</div>
}

export function EffectPoolProbe(
	props: {
		onFirst?: (inView: boolean, entry: IntersectionObserverEntry) => void;
		onSecond?: (inView: boolean, entry: IntersectionObserverEntry) => void;
	} = {},
) @{
	const first = useOnInView(props.onFirst ?? noopEffect, {
		threshold: 0.5,
		triggerOnce: true,
		initialInView: true,
	});
	const second = useOnInView(props.onSecond ?? noopEffect, {
		threshold: 0.5,
		triggerOnce: false,
		initialInView: false,
	});
	<>
		<div ref={first} data-testid="effect-first">first</div>
		<div ref={second} data-testid="effect-second">second</div>
	</>
}

export function ComponentProbe() @{
	<InView
		children={({ inView, ref }: { inView: boolean; ref(node: Element | null): void }) => <section
			ref={ref}
			data-testid="component"
		>
			{inView ? 'inside' : 'outside'}
		</section>}
	/>
}
