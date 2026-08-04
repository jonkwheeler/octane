import { useRef } from 'octane';

export function useEventCallback<T>(handler?: (value: T) => void): (value: T) => void {
	const callbackRef = useRef(handler);
	const fn = useRef((value: T) => {
		callbackRef.current?.(value);
	});
	callbackRef.current = handler;
	return fn.current;
}
