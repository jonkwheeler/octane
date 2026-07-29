export type TooltipType = 'none';
export type ValueType = number | string | ReadonlyArray<number | string>;
export type NameType = number | string;
export type Formatter<TValue extends ValueType = ValueType, TName extends NameType = NameType> = (
	value: TValue,
	name: TName,
	item: Payload<TValue, TName>,
	index: number,
	payload: ReadonlyArray<Payload<TValue, TName>>,
) => unknown;
export interface Payload<TValue extends ValueType = ValueType, TName extends NameType = NameType>
	extends Record<string, unknown> {
	value?: TValue;
	name?: TName;
}
export type TooltipItemSorter<TValue extends ValueType = ValueType, TName extends NameType = NameType> =
	| keyof Payload<TValue, TName>
	| ((item: Payload<TValue, TName>) => number | string);
export interface Props<TValue extends ValueType = ValueType, TName extends NameType = NameType>
	extends Record<string, unknown> {
	payload?: ReadonlyArray<Payload<TValue, TName>>;
	formatter?: Formatter<TValue, TName>;
}
export declare const defaultDefaultTooltipContentProps: Record<string, unknown>;
export declare function DefaultTooltipContent(props: Props): unknown;
