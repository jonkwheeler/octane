export type Props = Record<string, unknown>;
export type GridLineTypeFunctionProps = Record<string, unknown>;
export type AxisPropsForCartesianGridTicksGeneration = Record<string, unknown>;
export type HorizontalCoordinatesGenerator = (props: Record<string, unknown>) => number[];
export type VerticalCoordinatesGenerator = (props: Record<string, unknown>) => number[];
export declare const defaultCartesianGridProps: Record<string, unknown>;
export declare function CartesianGrid(props: Props): unknown;
