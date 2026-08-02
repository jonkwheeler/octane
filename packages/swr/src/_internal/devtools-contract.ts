export function readDevtoolsMiddleware(target: object): readonly unknown[] {
	const descriptor = Object.getOwnPropertyDescriptor(target, '__SWR_DEVTOOLS_USE__');
	if (!descriptor || !('value' in descriptor) || !Array.isArray(descriptor.value)) return [];
	return descriptor.value.slice();
}

export function setupOctaneDevtools(target: object, runtime: unknown): void {
	Object.defineProperty(target, '__SWR_DEVTOOLS_OCTANE__', {
		configurable: true,
		enumerable: false,
		writable: true,
		value: runtime,
	});
}
