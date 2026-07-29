export interface RadarPoint extends Record<string, unknown> {}
export type RadiusAxisForRadar = Record<string, unknown>;
export type AngleAxisForRadar = Record<string, unknown>;
export type Props<DataPointType = unknown, DataValueType = unknown> = Record<string, unknown>;
export type RadarComposedData = Record<string, unknown>;
export type InternalRadarProps = Record<string, unknown>;
export declare const defaultRadarProps: Record<string, unknown>;
export declare function computeRadarPoints(input: Record<string, unknown>): unknown[];
export declare function Radar<DataPointType = unknown, DataValueType = unknown>(
	props: Props<DataPointType, DataValueType>,
): unknown;
