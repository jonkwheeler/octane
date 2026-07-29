import type { NameType, Props as DefaultTooltipContentProps, ValueType } from './DefaultTooltipContent.tsrx';
export type ContentType<TValue extends ValueType = ValueType, TName extends NameType = NameType> =
	| unknown
	| ((props: TooltipContentProps<TValue, TName>) => unknown);
export type TooltipContentProps<TValue extends ValueType = ValueType, TName extends NameType = NameType> =
	TooltipProps<TValue, TName> & DefaultTooltipContentProps<TValue, TName>;
export type TooltipProps<TValue extends ValueType = ValueType, TName extends NameType = NameType> =
	Record<string, unknown> & {
		content?: ContentType<TValue, TName>;
	};
export declare const defaultTooltipProps: Record<string, unknown>;
export declare function Tooltip(props: TooltipProps): unknown;
