export interface GroupBase<Option> {
	readonly options: readonly Option[];
	readonly label?: string;
}

export type Options<Option> = readonly Option[];
export type SingleValue<Option> = Option | null;
export type MultiValue<Option> = readonly Option[];
export type PropsValue<Option> = MultiValue<Option> | SingleValue<Option>;
export type OnChangeValue<Option, IsMulti extends boolean> = IsMulti extends true
	? MultiValue<Option>
	: SingleValue<Option>;
export type SetValueAction = 'select-option' | 'deselect-option';
export type ActionMeta<Option> =
	| { action: 'clear'; removedValues: Options<Option>; name?: string }
	| { action: 'create-option'; name?: string; option: Option }
	| { action: 'deselect-option'; name?: string; option: Option }
	| { action: 'pop-value'; name?: string; removedValue: Option }
	| { action: 'remove-value'; name?: string; removedValue: Option }
	| { action: 'select-option'; name?: string; option?: Option }
	| { action: 'set-value'; name?: string };
export type InputAction = 'set-value' | 'input-change' | 'input-blur' | 'menu-close';
export interface InputActionMeta {
	action: InputAction;
	prevInputValue: string;
}

export interface Colors {
	primary: string;
	primary75: string;
	primary50: string;
	primary25: string;
	danger: string;
	dangerLight: string;
	neutral0: string;
	neutral5: string;
	neutral10: string;
	neutral20: string;
	neutral30: string;
	neutral40: string;
	neutral50: string;
	neutral60: string;
	neutral70: string;
	neutral80: string;
	neutral90: string;
}

export interface ThemeSpacing {
	baseUnit: number;
	controlHeight: number;
	menuGutter: number;
}

export interface Theme {
	borderRadius: number;
	colors: Colors;
	spacing: ThemeSpacing;
}

export type CSSInterpolation =
	string | number | boolean | null | undefined | CSSObjectWithLabel | readonly CSSInterpolation[];

export type CSSObjectWithLabel = {
	[key: string]: CSSInterpolation;
	label?: string;
};
