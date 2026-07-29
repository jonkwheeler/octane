export interface PolarAngleAxisProps<DataPointType = unknown, DataValueType = unknown>
	extends Record<string, unknown> {}
export type Props<DataPointType = unknown, DataValueType = unknown> = PolarAngleAxisProps<
	DataPointType,
	DataValueType
>;
export declare function PolarAngleAxis<DataPointType = unknown, DataValueType = unknown>(
	props: Props<DataPointType, DataValueType>,
): unknown;
