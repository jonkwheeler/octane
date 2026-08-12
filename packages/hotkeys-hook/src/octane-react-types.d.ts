import type * as ReactTypes from 'react';

declare module 'octane' {
	export type DependencyList = ReactTypes.DependencyList;
	export type ReactNode = ReactTypes.ReactNode;
	export type RefCallback<T> = ReactTypes.RefCallback<T>;
}

export {};
