import type { SWRHook } from '../_internal/index.js';
import type { SWRConfigProps } from '../_internal/utils/config-context.js';

declare const useSWR: SWRHook;
export default useSWR;
export declare const SWRConfig: (props: SWRConfigProps) => unknown;
export declare const useSWRHandler: SWRHook;
