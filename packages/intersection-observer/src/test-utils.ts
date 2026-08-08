import { act } from 'octane';

type MockFn = <T extends (...args: any[]) => any>(
	implementation?: T,
) => T & {
	mock: { calls: Parameters<T>[] };
	mockClear(): void;
};

interface ObserverRecord {
	callback: IntersectionObserverCallback;
	elements: Set<Element>;
	instance: IntersectionObserver;
}

const observers = new Map<IntersectionObserver, ObserverRecord>();
let originalIntersectionObserver: typeof IntersectionObserver | undefined;

function entryFor(element: Element, isIntersecting: boolean, ratio: number) {
	const rect = element.getBoundingClientRect();
	return {
		boundingClientRect: rect,
		intersectionRatio: ratio,
		intersectionRect: isIntersecting ? rect : DOMRectReadOnly.fromRect(),
		isIntersecting,
		rootBounds: DOMRectReadOnly.fromRect(),
		target: element,
		time: Date.now(),
	} satisfies IntersectionObserverEntry;
}

function intersectionState(observer: IntersectionObserver, trigger: boolean | number) {
	if (typeof trigger === 'boolean') {
		return { isIntersecting: trigger, ratio: trigger ? 1 : 0 };
	}
	const intersectedThresholds = observer.thresholds.filter((threshold) => trigger >= threshold);
	return {
		isIntersecting: intersectedThresholds.length > 0,
		ratio: intersectedThresholds.at(-1) ?? 0,
	};
}

export function setupIntersectionMocking(mockFn: MockFn) {
	originalIntersectionObserver = window.IntersectionObserver;
	window.IntersectionObserver = mockFn(function IntersectionObserverMock(
		callback: IntersectionObserverCallback,
		options: IntersectionObserverInit = {},
	) {
		const elements = new Set<Element>();
		const instance = {
			thresholds: Array.isArray(options.threshold) ? options.threshold : [options.threshold ?? 0],
			root: options.root ?? null,
			rootMargin: options.rootMargin ?? '',
			scrollMargin: options.scrollMargin ?? '',
			observe: mockFn((element: Element) => {
				elements.add(element);
			}),
			unobserve: mockFn((element: Element) => {
				elements.delete(element);
			}),
			disconnect: mockFn(() => {
				observers.delete(instance);
				elements.clear();
			}),
			takeRecords: mockFn(() => []),
		} as unknown as IntersectionObserver;
		observers.set(instance, { callback, elements, instance });
		return instance;
	}) as unknown as typeof IntersectionObserver;
}

export function resetIntersectionMocking() {
	observers.clear();
	(window.IntersectionObserver as unknown as { mockClear?: () => void }).mockClear?.();
}

export function destroyIntersectionMocking() {
	resetIntersectionMocking();
	if (originalIntersectionObserver) window.IntersectionObserver = originalIntersectionObserver;
	else delete (window as any).IntersectionObserver;
	originalIntersectionObserver = undefined;
}

export function mockAllIsIntersecting(isIntersecting: boolean | number) {
	act(() => {
		observers.forEach(({ callback, elements, instance }) => {
			const state = intersectionState(instance, isIntersecting);
			callback(
				[...elements].map((element) => entryFor(element, state.isIntersecting, state.ratio)),
				instance,
			);
		});
	});
}

export function mockIsIntersecting(element: Element, isIntersecting: boolean | number) {
	const matching = [...observers.values()].filter(({ elements }) => elements.has(element));
	if (matching.length === 0) throw new Error('No IntersectionObserver instance found for element');
	act(() => {
		for (const observer of matching) {
			const state = intersectionState(observer.instance, isIntersecting);
			observer.callback([entryFor(element, state.isIntersecting, state.ratio)], observer.instance);
		}
	});
}

export function intersectionMockInstance(element: Element) {
	const observer = [...observers.values()].find(({ elements }) => elements.has(element));
	if (!observer) throw new Error('No IntersectionObserver instance found for element');
	return observer.instance;
}
