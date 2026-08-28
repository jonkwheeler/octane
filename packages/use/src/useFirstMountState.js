import { useRef } from 'octane';
export function useFirstMountState() {
	var isFirst = useRef(true);
	if (isFirst.current) {
		isFirst.current = false;
		return true;
	}
	return isFirst.current;
}
