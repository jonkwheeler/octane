import { useRef } from 'octane';
export function useRendersCount() {
	return ++useRef(0).current;
}
