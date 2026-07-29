export interface ScatterPointNode extends Record<string, unknown> {}
export interface ScatterPointItem extends Record<string, unknown> {}
export type Props<DataPointType = unknown, ValueAxisType = unknown> = Record<string, unknown>;
export declare function computeScatterPoints(input: Record<string, unknown>): unknown[];
export declare const defaultScatterProps: Record<string, unknown>;
export declare const Scatter: <DataPointType = unknown, ValueAxisType = unknown>(
	props: Props<DataPointType, ValueAxisType>,
) => unknown;
