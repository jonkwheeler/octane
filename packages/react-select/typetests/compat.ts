import type {
	ActionMeta as LocalActionMeta,
	AriaLiveMessages as LocalAriaLiveMessages,
	ClassNamesConfig as LocalClassNamesConfig,
	GroupBase as LocalGroupBase,
	InputActionMeta as LocalInputActionMeta,
	OnChangeValue as LocalOnChangeValue,
	OptionsOrGroups as LocalOptionsOrGroups,
	Props as LocalProps,
	PropsValue as LocalPropsValue,
	SelectComponentsConfig as LocalSelectComponentsConfig,
	SelectInstance as LocalSelectInstance,
	StylesConfig as LocalStylesConfig,
} from '../src/index';
import type { AsyncProps as LocalAsyncProps } from '../src/async.tsrx';
import type { CreatableProps as LocalCreatableProps } from '../src/creatable.tsrx';
import type {
	ActionMeta as ReactActionMeta,
	AriaLiveMessages as ReactAriaLiveMessages,
	ClassNamesConfig as ReactClassNamesConfig,
	GroupBase as ReactGroupBase,
	InputActionMeta as ReactInputActionMeta,
	OnChangeValue as ReactOnChangeValue,
	OptionsOrGroups as ReactOptionsOrGroups,
	Props as ReactProps,
	PropsValue as ReactPropsValue,
	SelectComponentsConfig as ReactSelectComponentsConfig,
	SelectInstance as ReactSelectInstance,
	StylesConfig as ReactStylesConfig,
} from 'react-select';
import type { AsyncProps as ReactAsyncProps } from 'react-select/async';
import type { CreatableProps as ReactCreatableProps } from 'react-select/creatable';

type Equal<Left, Right> =
	(<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
		? (<Value>() => Value extends Right ? 1 : 2) extends <Value>() => Value extends Left ? 1 : 2
			? true
			: false
		: false;
type Expect<Value extends true> = Value;
type Extends<Left, Right> = Left extends Right ? true : false;

type Option = { label: string; value: string };
type Group = { label: string; options: readonly Option[] };

type PropContract =
	| 'backspaceRemovesValue'
	| 'blurInputOnSelect'
	| 'captureMenuScroll'
	| 'closeMenuOnScroll'
	| 'closeMenuOnSelect'
	| 'controlShouldRenderValue'
	| 'defaultInputValue'
	| 'defaultMenuIsOpen'
	| 'defaultValue'
	| 'escapeClearsValue'
	| 'filterOption'
	| 'getOptionLabel'
	| 'getOptionValue'
	| 'hideSelectedOptions'
	| 'inputValue'
	| 'isClearable'
	| 'isDisabled'
	| 'isLoading'
	| 'isMulti'
	| 'isOptionDisabled'
	| 'isOptionSelected'
	| 'isRtl'
	| 'isSearchable'
	| 'menuIsOpen'
	| 'menuPlacement'
	| 'menuPosition'
	| 'menuShouldBlockScroll'
	| 'menuShouldScrollIntoView'
	| 'name'
	| 'onChange'
	| 'onInputChange'
	| 'onMenuClose'
	| 'onMenuOpen'
	| 'openMenuOnClick'
	| 'openMenuOnFocus'
	| 'options'
	| 'pageSize'
	| 'tabSelectsValue'
	| 'value';
type InstanceContract =
	| 'blur'
	| 'buildCategorizedOptions'
	| 'buildFocusableOptions'
	| 'clearValue'
	| 'focus'
	| 'focusOption'
	| 'focusValue'
	| 'getClassNames'
	| 'getOptionLabel'
	| 'getOptionValue'
	| 'getValue'
	| 'openMenu'
	| 'popValue'
	| 'removeValue'
	| 'selectOption'
	| 'setValue';
type AsyncContract = 'cacheOptions' | 'defaultOptions' | 'isLoading' | 'loadOptions';
type CreatableContract =
	'allowCreateWhileLoading' | 'createOptionPosition' | 'isValidNewOption' | 'onCreateOption';

type ActionMetaParity = Expect<Equal<LocalActionMeta<Option>, ReactActionMeta<Option>>>;
type InputActionMetaParity = Expect<Equal<LocalInputActionMeta, ReactInputActionMeta>>;
type SingleChangeParity = Expect<
	Equal<LocalOnChangeValue<Option, false>, ReactOnChangeValue<Option, false>>
>;
type MultiChangeParity = Expect<
	Equal<LocalOnChangeValue<Option, true>, ReactOnChangeValue<Option, true>>
>;
type OptionsParity = Expect<
	Equal<LocalOptionsOrGroups<Option, Group>, ReactOptionsOrGroups<Option, Group>>
>;
type ValueParity = Expect<Equal<LocalPropsValue<Option>, ReactPropsValue<Option>>>;
type GroupBaseParity = Expect<Equal<LocalGroupBase<Option>, ReactGroupBase<Option>>>;
type PropsParity = Expect<
	Equal<
		Pick<LocalProps<Option, false, Group>, PropContract>,
		Pick<ReactProps<Option, false, Group>, PropContract>
	>
>;
type AsyncParity = Expect<
	Extends<
		Pick<LocalAsyncProps<Option, false, Group>, AsyncContract>,
		Pick<ReactAsyncProps<Option, false, Group>, AsyncContract>
	>
>;
type AsyncReverseParity = Expect<
	Extends<
		Pick<ReactAsyncProps<Option, false, Group>, AsyncContract>,
		Pick<LocalAsyncProps<Option, false, Group>, AsyncContract>
	>
>;
type CreatableParity = Expect<
	Extends<
		Pick<LocalCreatableProps<Option, false, Group>, CreatableContract>,
		Pick<ReactCreatableProps<Option, false, Group>, CreatableContract>
	>
>;
type CreatableReverseParity = Expect<
	Extends<
		Pick<ReactCreatableProps<Option, false, Group>, CreatableContract>,
		Pick<LocalCreatableProps<Option, false, Group>, CreatableContract>
	>
>;
type InstanceParity = Expect<
	Extends<
		Pick<LocalSelectInstance<Option, false, Group>, InstanceContract>,
		Pick<ReactSelectInstance<Option, false, Group>, InstanceContract>
	>
>;
type InstanceReverseParity = Expect<
	Extends<
		Pick<ReactSelectInstance<Option, false, Group>, InstanceContract>,
		Pick<LocalSelectInstance<Option, false, Group>, InstanceContract>
	>
>;
type ComponentKeysParity = Expect<
	Equal<
		keyof LocalSelectComponentsConfig<Option, false, Group>,
		keyof ReactSelectComponentsConfig<Option, false, Group>
	>
>;
type StyleKeysParity = Expect<
	Equal<
		keyof LocalStylesConfig<Option, false, Group>,
		keyof ReactStylesConfig<Option, false, Group>
	>
>;
type ClassNameKeysParity = Expect<
	Equal<
		keyof LocalClassNamesConfig<Option, false, Group>,
		keyof ReactClassNamesConfig<Option, false, Group>
	>
>;
type AriaKeysParity = Expect<
	Equal<
		keyof LocalAriaLiveMessages<Option, false, Group>,
		keyof ReactAriaLiveMessages<Option, false, Group>
	>
>;

declare const localPropsContract: Pick<LocalProps<Option, false, Group>, PropContract>;
declare const reactPropsContract: Pick<ReactProps<Option, false, Group>, PropContract>;
const localPropsToReact: Pick<ReactProps<Option, false, Group>, PropContract> = localPropsContract;
const reactPropsToLocal: Pick<LocalProps<Option, false, Group>, PropContract> = reactPropsContract;
void localPropsToReact;
void reactPropsToLocal;
declare const localAsyncContract: Pick<LocalAsyncProps<Option, false, Group>, AsyncContract>;
declare const reactAsyncContract: Pick<ReactAsyncProps<Option, false, Group>, AsyncContract>;
const localAsyncToReact: Pick<
	ReactAsyncProps<Option, false, Group>,
	AsyncContract
> = localAsyncContract;
const reactAsyncToLocal: Pick<
	LocalAsyncProps<Option, false, Group>,
	AsyncContract
> = reactAsyncContract;
declare const localCreatableContract: Pick<
	LocalCreatableProps<Option, false, Group>,
	CreatableContract
>;
declare const reactCreatableContract: Pick<
	ReactCreatableProps<Option, false, Group>,
	CreatableContract
>;
const localCreatableToReact: Pick<
	ReactCreatableProps<Option, false, Group>,
	CreatableContract
> = localCreatableContract;
const reactCreatableToLocal: Pick<
	LocalCreatableProps<Option, false, Group>,
	CreatableContract
> = reactCreatableContract;
declare const localInstanceContract: Pick<
	LocalSelectInstance<Option, false, Group>,
	InstanceContract
>;
declare const reactInstanceContract: Pick<
	ReactSelectInstance<Option, false, Group>,
	InstanceContract
>;
const localInstanceToReact: Pick<
	ReactSelectInstance<Option, false, Group>,
	InstanceContract
> = localInstanceContract;
const reactInstanceToLocal: Pick<
	LocalSelectInstance<Option, false, Group>,
	InstanceContract
> = reactInstanceContract;
void localAsyncToReact;
void reactAsyncToLocal;
void localCreatableToReact;
void reactCreatableToLocal;
void localInstanceToReact;
void reactInstanceToLocal;

export type PureTypeParity = readonly [
	ActionMetaParity,
	InputActionMetaParity,
	SingleChangeParity,
	MultiChangeParity,
	OptionsParity,
	ValueParity,
	GroupBaseParity,
	PropsParity,
	AsyncParity,
	AsyncReverseParity,
	CreatableParity,
	CreatableReverseParity,
	InstanceParity,
	InstanceReverseParity,
	ComponentKeysParity,
	StyleKeysParity,
	ClassNameKeysParity,
	AriaKeysParity,
];
