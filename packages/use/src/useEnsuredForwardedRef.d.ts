import type { MutableRefObject, ReactNode } from 'react';

export default function useEnsuredForwardedRef<T>(
	forwardedRef: MutableRefObject<T>,
): MutableRefObject<T>;
export declare function ensuredForwardRef<T, P = object>(
	Component: (props: P, ref: MutableRefObject<T>) => ReactNode,
): (props: P & { ref?: MutableRefObject<T> }) => ReactNode;
