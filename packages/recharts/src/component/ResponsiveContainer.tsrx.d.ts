export interface ResponsiveContainerDimensions {
	width: number;
	height: number;
}
export type Props = Record<string, unknown>;
export declare const defaultResponsiveContainerDimension: ResponsiveContainerDimensions;
export declare const ResponsiveContainerContextProviderInternal: unknown;
export declare function useResponsiveContainerContext(): ResponsiveContainerDimensions;
export declare function ResponsiveContainer(props: Props): unknown;
