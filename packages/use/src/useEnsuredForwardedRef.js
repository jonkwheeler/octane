import { useEffect, useRef } from 'octane';
export default function useEnsuredForwardedRef(forwardedRef) {
	var ensuredRef = useRef(forwardedRef && forwardedRef.current);
	useEffect(
		function () {
			if (!forwardedRef) {
				return;
			}
			forwardedRef.current = ensuredRef.current;
		},
		[forwardedRef],
	);
	return ensuredRef;
}
export function ensuredForwardRef(Component) {
	return function (props) {
		var ref = props.ref;
		var ensuredRef = useEnsuredForwardedRef(ref);
		return Component(props, ensuredRef);
	};
}
