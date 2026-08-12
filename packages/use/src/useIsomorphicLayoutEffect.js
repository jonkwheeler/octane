import { useEffect, useLayoutEffect } from 'octane';
import { isBrowser } from './misc/util';
var useIsomorphicLayoutEffect = isBrowser ? useLayoutEffect : useEffect;
export default useIsomorphicLayoutEffect;
