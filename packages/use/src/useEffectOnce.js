import { useEffect } from 'octane';
var useEffectOnce = function (effect) {
	useEffect(effect, []);
};
export default useEffectOnce;
