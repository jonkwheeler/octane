import type { LegendPayload, Props as DefaultLegendContentProps } from './DefaultLegendContent.tsrx';
export type LegendItemSorter = 'value' | 'dataKey' | ((item: LegendPayload) => number | string);
export type Props = DefaultLegendContentProps & Record<string, unknown>;
export declare const legendDefaultProps: Record<string, unknown>;
export declare function Legend(props: Props): unknown;
