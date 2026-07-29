export interface PolarRadiusAxisProps<DataPointType = unknown, DataValueType = unknown>
	extends Record<string, unknown> {}
export type Props<DataPointType = unknown, DataValueType = unknown> = PolarRadiusAxisProps<
	DataPointType,
	DataValueType
>;
export declare function PolarRadiusAxis<DataPointType = unknown, DataValueType = unknown>(
	props: Props<DataPointType, DataValueType>,
): unknown;
