export type BaseValue = number | 'dataMin' | 'dataMax';
export type Props<DataPointType = unknown, ValueAxisType = unknown> = Record<string, unknown>;
export declare const defaultAreaProps: Record<string, unknown>;
export declare function computeArea(input: Record<string, unknown>): unknown;
export declare const Area: <DataPointType = unknown, ValueAxisType = unknown>(
	props: Props<DataPointType, ValueAxisType>,
) => unknown;
