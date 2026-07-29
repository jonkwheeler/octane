export type FunnelTrapezoidItem = Record<string, unknown>;
export type Props<DataPointType = unknown, DataValueType = unknown> = Record<string, unknown>;
export declare const defaultFunnelProps: Record<string, unknown>;
export declare function computeFunnelTrapezoids(input: Record<string, unknown>): unknown[];
export declare const Funnel: <DataPointType = unknown, DataValueType = unknown>(
	props: Props<DataPointType, DataValueType>,
) => unknown;
