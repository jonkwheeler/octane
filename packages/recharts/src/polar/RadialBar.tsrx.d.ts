export type RadialBarDataItem = Record<string, unknown>;
export type RadialBarProps<DataPointType = unknown, DataValueType = unknown> = Record<string, unknown>;
export declare const defaultRadialBarProps: Record<string, unknown>;
export declare function computeRadialBarDataItems(input: Record<string, unknown>): unknown[];
export declare function RadialBar<DataPointType = unknown, DataValueType = unknown>(
	props: RadialBarProps<DataPointType, DataValueType>,
): unknown;
