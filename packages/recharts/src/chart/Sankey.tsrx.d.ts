export interface NodeProps extends Record<string, unknown> {}
export interface LinkProps extends Record<string, unknown> {}
export interface SankeyData extends Record<string, unknown> {}
export type SankeyNodeOptions = unknown;
export type Props = Record<string, unknown>;
export type SankeyElementType = 'node' | 'link';
export declare const sankeyDefaultProps: Record<string, unknown>;
export declare function computeData(input: Record<string, unknown>): unknown;
export declare function Sankey(props: Props): unknown;
