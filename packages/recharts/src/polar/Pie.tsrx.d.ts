export type PieLabelRenderProps = Record<string, unknown>;
export type LabelListPropsWithPosition = Record<string, unknown>;
export type PieLabel = unknown | ((props: PieLabelRenderProps) => unknown);
export type PieSectorData = Record<string, unknown>;
export type PieSectorDataItem = Record<string, unknown>;
export type PieSectorShapeProps = Record<string, unknown>;
export type PieShape = unknown;
export type Props<DataPointType = unknown, DataValueType = unknown> = Record<string, unknown>;
export type PieCoordinate = Record<string, number>;
export declare const defaultPieProps: Record<string, unknown>;
export declare function computePieSectors(input: Record<string, unknown>): unknown[];
export declare const Pie: <DataPointType = unknown, DataValueType = unknown>(
	props: Props<DataPointType, DataValueType>,
) => unknown;
