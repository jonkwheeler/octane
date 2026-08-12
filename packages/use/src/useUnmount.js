import { useRef } from 'octane';
import useEffectOnce from './useEffectOnce';
var useUnmount = function (fn) {
	var fnRef = useRef(fn);
	// update the ref each render so if it change the newest callback will be invoked
	fnRef.current = fn;
	useEffectOnce(function () {
		return function () {
			return fnRef.current();
		};
	});
};
export default useUnmount;
