import { useEffect } from 'octane';
import { useFirstMountState } from './useFirstMountState';
var useUpdateEffect = function (effect, deps) {
	var isFirstMount = useFirstMountState();
	useEffect(function () {
		if (!isFirstMount) {
			return effect();
		}
	}, deps);
};
export default useUpdateEffect;
