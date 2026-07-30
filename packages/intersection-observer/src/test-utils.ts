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

const observers = new Map<Element, ObserverRecord>();
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
			observe: mockFn((element: Element) => {
				elements.add(element);
				observers.set(element, { callback, elements, instance });
			}),
			unobserve: mockFn((element: Element) => {
				elements.delete(element);
				observers.delete(element);
			}),
			disconnect: mockFn(() => {
				elements.forEach((element) => observers.delete(element));
				elements.clear();
			}),
			takeRecords: mockFn(() => []),
		} as unknown as IntersectionObserver;
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
	const ratio = typeof isIntersecting === 'number' ? isIntersecting : isIntersecting ? 1 : 0;
	const unique = new Map<IntersectionObserver, ObserverRecord>();
	observers.forEach((observer) => unique.set(observer.instance, observer));
	act(() => {
		unique.forEach(({ callback, elements, instance }) => {
			callback(
				[...elements].map((element) => entryFor(element, ratio > 0, ratio)),
				instance,
			);
		});
	});
}

export function mockIsIntersecting(element: Element, isIntersecting: boolean | number) {
	const observer = observers.get(element);
	if (!observer) throw new Error('No IntersectionObserver instance found for element');
	const ratio = typeof isIntersecting === 'number' ? isIntersecting : isIntersecting ? 1 : 0;
	act(() => observer.callback([entryFor(element, ratio > 0, ratio)], observer.instance));
}

export function intersectionMockInstance(element: Element) {
	const observer = observers.get(element);
	if (!observer) throw new Error('No IntersectionObserver instance found for element');
	return observer.instance;
}
