export interface ErrorBarDataItem extends Record<string, unknown> {}
export type ErrorBarDirection = 'x' | 'y';
export type ErrorBarDataPointFormatter<T = unknown> = (entry: T, dataKey: unknown) => unknown;
export type Props = Record<string, unknown>;
export declare const errorBarDefaultProps: Record<string, unknown>;
export declare function ErrorBar(props: Props): unknown;
