import gsap from 'gsap';
import { useGSAP } from '@octanejs/gsap';

declare function expectType<T>(value: T): void;
declare const element: Element;
declare const elementRef: { current: Element | null };

function consumerTypeFixtures() {
	const callback = (
		context: gsap.Context,
		contextSafe: <T extends (...args: any[]) => any>(fn: T) => T,
	) => {
		expectType<gsap.Context>(context);
		expectType<() => void>(contextSafe(() => {}));
	};

	expectType<gsap.Context>(useGSAP(callback).context);
	expectType<gsap.Context>(useGSAP(callback, []).context);
	expectType<gsap.Context>(useGSAP(callback, { dependencies: [], scope: element }).context);
	expectType<gsap.Context>(useGSAP({ scope: elementRef, revertOnUpdate: true }).context);
	expectType<gsap.Context>(useGSAP({ scope: '.scope' }).context);
	expectType<true>(useGSAP.headless);
	useGSAP.register(gsap);

	// @ts-expect-error callbacks must be functions.
	useGSAP(42);
	// @ts-expect-error scope must resolve to a selector, element, or ref-like object.
	useGSAP({ scope: 42 });
}

void consumerTypeFixtures;
