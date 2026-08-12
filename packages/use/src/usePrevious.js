import { useEffect, useRef } from 'octane';
export default function usePrevious(state) {
	var ref = useRef();
	useEffect(function () {
		ref.current = state;
	});
	return ref.current;
}
