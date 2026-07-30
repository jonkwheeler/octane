import { InView, useInView, useOnInView } from '@octanejs/intersection-observer';

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
