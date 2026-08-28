import { useRef } from 'octane';
import deepEqual from './deepEqual';

export default function useDeepEqualMemo<T>(value: T) {
	const ref = useRef<T | undefined>(undefined);

	if (!deepEqual(ref.current, value)) {
		ref.current = value;
	}

	return ref.current;
}
