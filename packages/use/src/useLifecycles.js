import { useEffect } from 'octane';
var useLifecycles = function (mount, unmount) {
	useEffect(function () {
		if (mount) {
			mount();
		}
		return function () {
			if (unmount) {
				unmount();
			}
		};
	}, []);
};
export default useLifecycles;
