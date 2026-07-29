export type HorizontalAlignmentType = 'center' | 'left' | 'right';
export type VerticalAlignmentType = 'top' | 'bottom' | 'middle';
export interface LegendPayload extends Record<string, unknown> {
	value?: unknown;
	dataKey?: unknown;
}
export type Formatter = (value: unknown, entry: LegendPayload, index: number) => unknown;
export type ContentType = unknown | ((props: Props) => unknown);
export type Props = Record<string, unknown> & {
	payload?: ReadonlyArray<LegendPayload>;
	formatter?: Formatter;
};
export declare const defaultLegendContentDefaultProps: Record<string, unknown>;
export declare function DefaultLegendContent(props: Props): unknown;
