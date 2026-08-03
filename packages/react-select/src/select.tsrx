import { useImperativeHandle, useMemo, useRef, useState } from 'octane';
import type { OctaneNode } from 'octane';

import {
	formatGroupLabel as formatGroupLabelBuiltin,
	getOptionLabel as getOptionLabelBuiltin,
	getOptionValue as getOptionValueBuiltin,
	isOptionDisabled as isOptionDisabledBuiltin,
} from './builtins';
import {
	components as builtinComponents,
	defaultComponents,
	type SelectComponentsConfig,
	type Ref,
} from './components.tsrx';
import { createFilter, type FilterOptionOption } from './filters';
import { defaultStyles } from './default-styles';
import { useStyleResolver } from './style-context.tsrx';
import type { ClassNamesConfig, StyleKey, StylesConfig } from './styles';
import { defaultTheme, type ThemeConfig } from './theme';
import type {
	ActionMeta,
	GetOptionLabel,
	GetOptionValue,
	GroupBase,
	InputActionMeta,
	OnChangeValue,
	Options,
	OptionsOrGroups,
	PropsValue,
	SetValueAction,
	Theme,
} from './types';
import { classNames, cleanValue, valueTernary } from './utils';

export type FormatOptionLabelContext = 'menu' | 'value';
export interface FormatOptionLabelMeta<Option> {
	context: FormatOptionLabelContext;
	inputValue: string;
	selectValue: Options<Option>;
}

export interface SelectProps<
	Option = unknown,
	IsMulti extends boolean = false,
	Group extends GroupBase<Option> = GroupBase<Option>,
> {
	ref?: Ref<SelectInstance<Option>>;
	'aria-errormessage'?: string;
	'aria-invalid'?: boolean | 'false' | 'true' | 'grammar' | 'spelling';
	'aria-label'?: string;
	'aria-labelledby'?: string;
	'aria-live'?: 'off' | 'polite' | 'assertive';
	autoFocus?: boolean;
	backspaceRemovesValue?: boolean;
	blurInputOnSelect?: boolean;
	captureMenuScroll?: boolean;
	className?: string;
	classNamePrefix?: string | null;
	classNames?: ClassNamesConfig<Option, IsMulti, Group>;
	closeMenuOnSelect?: boolean;
	closeMenuOnScroll?: boolean | ((event: Event) => boolean);
	components?: SelectComponentsConfig;
	controlShouldRenderValue?: boolean;
	delimiter?: string;
	escapeClearsValue?: boolean;
	filterOption?: ((option: FilterOptionOption<Option>, inputValue: string) => boolean) | null;
	formatGroupLabel?: (group: Group) => OctaneNode;
	formatOptionLabel?: (data: Option, meta: FormatOptionLabelMeta<Option>) => OctaneNode;
	form?: string;
	getOptionLabel?: GetOptionLabel<Option>;
	getOptionValue?: GetOptionValue<Option>;
	hideSelectedOptions?: boolean;
	id?: string;
	inputId?: string;
	inputValue?: string;
	instanceId?: number | string;
	isClearable?: boolean;
	isDisabled?: boolean;
	isLoading?: boolean;
	isMulti?: IsMulti;
	isOptionDisabled?: (option: Option, selectValue: Options<Option>) => boolean;
	isOptionSelected?: (option: Option, selectValue: Options<Option>) => boolean;
	isRtl?: boolean;
	isSearchable?: boolean;
	loadingMessage?: (value: { inputValue: string }) => OctaneNode;
	maxMenuHeight?: number;
	menuIsOpen?: boolean;
	menuPlacement?: 'auto' | 'bottom' | 'top';
	menuPortalTarget?: HTMLElement | null;
	menuPosition?: 'absolute' | 'fixed';
	menuShouldBlockScroll?: boolean;
	menuShouldScrollIntoView?: boolean;
	minMenuHeight?: number;
	name?: string;
	noOptionsMessage?: (value: { inputValue: string }) => OctaneNode;
	onBlur?: (event: FocusEvent) => void;
	onChange?: (value: OnChangeValue<Option, IsMulti>, actionMeta: ActionMeta<Option>) => void;
	onFocus?: (event: FocusEvent) => void;
	onInputChange?: (newValue: string, actionMeta: InputActionMeta) => void;
	onKeyDown?: (event: KeyboardEvent) => void;
	onMenuClose?: () => void;
	onMenuOpen?: () => void;
	onMenuScrollToBottom?: (event: WheelEvent | TouchEvent) => void;
	onMenuScrollToTop?: (event: WheelEvent | TouchEvent) => void;
	openMenuOnClick?: boolean;
	openMenuOnFocus?: boolean;
	options?: OptionsOrGroups<Option, Group>;
	pageSize?: number;
	placeholder?: OctaneNode;
	required?: boolean;
	screenReaderStatus?: (value: { count: number }) => string;
	styles?: StylesConfig<Option, IsMulti, Group>;
	tabIndex?: number;
	tabSelectsValue?: boolean;
	theme?: ThemeConfig;
	unstyled?: boolean;
	value?: PropsValue<Option>;
}

export interface SelectInstance<
	Option = unknown,
	IsMulti extends boolean = false,
	Group extends GroupBase<Option> = GroupBase<Option>,
> {
	blur(): void;
	focus(): void;
	getValue(): Options<Option>;
	readonly __types?: readonly [IsMulti, Group];
}

export const defaultProps = {
	'aria-live': 'polite' as const,
	backspaceRemovesValue: true,
	blurInputOnSelect: false,
	captureMenuScroll: true,
	classNames: {},
	closeMenuOnSelect: true,
	closeMenuOnScroll: false,
	components: {},
	controlShouldRenderValue: true,
	escapeClearsValue: false,
	filterOption: createFilter(),
	formatGroupLabel: formatGroupLabelBuiltin,
	getOptionLabel: getOptionLabelBuiltin,
	getOptionValue: getOptionValueBuiltin,
	isDisabled: false,
	isLoading: false,
	isMulti: false,
	isRtl: false,
	isSearchable: true,
	isOptionDisabled: isOptionDisabledBuiltin,
	loadingMessage: () => 'Loading...',
	maxMenuHeight: 300,
	minMenuHeight: 140,
	menuIsOpen: false,
	menuPlacement: 'bottom' as const,
	menuPosition: 'absolute' as const,
	menuShouldBlockScroll: false,
	menuShouldScrollIntoView: true,
	noOptionsMessage: () => 'No options',
	openMenuOnFocus: false,
	openMenuOnClick: true,
	options: [],
	pageSize: 5,
	placeholder: 'Select...',
	screenReaderStatus: ({ count }: { count: number }) =>
		`${count} result${count !== 1 ? 's' : ''} available`,
	styles: {},
	tabIndex: 0,
	tabSelectsValue: true,
	unstyled: false,
};

export interface CategorizedOption<Option> {
	type: 'option';
	data: Option;
	isDisabled: boolean;
	isSelected: boolean;
	label: string;
	value: string;
	index: number;
}

export interface CategorizedGroup<Option, Group extends GroupBase<Option>> {
	type: 'group';
	data: Group;
	options: readonly CategorizedOption<Option>[];
	index: number;
}

export type CategorizedGroupOrOption<Option, Group extends GroupBase<Option>> =
	| CategorizedGroup<Option, Group>
	| CategorizedOption<Option>;

function isSelected<Option, IsMulti extends boolean, Group extends GroupBase<Option>>(
	props: RequiredSelectProps<Option, IsMulti, Group>,
	option: Option,
	selectValue: Options<Option>,
) {
	if (selectValue.indexOf(option) > -1) return true;
	if (props.isOptionSelected) return props.isOptionSelected(option, selectValue);
	const candidate = props.getOptionValue(option);
	return selectValue.some((value) => props.getOptionValue(value) === candidate);
}

type RequiredSelectProps<Option, IsMulti extends boolean, Group extends GroupBase<Option>> =
	SelectProps<Option, IsMulti, Group> & {
		'aria-live': 'off' | 'polite' | 'assertive';
		classNames: ClassNamesConfig<Option, IsMulti, Group>;
		closeMenuOnSelect: boolean;
		components: SelectComponentsConfig;
		controlShouldRenderValue: boolean;
		filterOption: ((option: FilterOptionOption<Option>, inputValue: string) => boolean) | null;
		formatGroupLabel: (group: Group) => OctaneNode;
		getOptionLabel: GetOptionLabel<Option>;
		getOptionValue: GetOptionValue<Option>;
		isDisabled: boolean;
		isLoading: boolean;
		isMulti: IsMulti;
		isOptionDisabled: (option: Option, selectValue: Options<Option>) => boolean;
		isRtl: boolean;
		loadingMessage: (value: { inputValue: string }) => OctaneNode;
		maxMenuHeight: number;
		menuIsOpen: boolean;
		menuPlacement: 'auto' | 'bottom' | 'top';
		menuPosition: 'absolute' | 'fixed';
		menuShouldScrollIntoView: boolean;
		minMenuHeight: number;
		noOptionsMessage: (value: { inputValue: string }) => OctaneNode;
		onChange: (value: OnChangeValue<Option, IsMulti>, actionMeta: ActionMeta<Option>) => void;
		onInputChange: (newValue: string, actionMeta: InputActionMeta) => void;
		onMenuClose: () => void;
		onMenuOpen: () => void;
		openMenuOnClick: boolean;
		options: OptionsOrGroups<Option, Group>;
		placeholder: OctaneNode;
		styles: StylesConfig<Option, IsMulti, Group>;
		tabIndex: number;
		tabSelectsValue: boolean;
		unstyled: boolean;
	};

export function buildCategorizedOptions<
	Option,
	IsMulti extends boolean,
	Group extends GroupBase<Option>,
>(
	props: RequiredSelectProps<Option, IsMulti, Group>,
	selectValue: Options<Option>,
): CategorizedGroupOrOption<Option, Group>[] {
	const hideSelected = props.hideSelectedOptions ?? props.isMulti;
	const categorize = (option: Option, index: number): CategorizedOption<Option> => ({
		type: 'option',
		data: option,
		isDisabled: props.isOptionDisabled(option, selectValue),
		isSelected: isSelected(props, option, selectValue),
		label: props.getOptionLabel(option),
		value: props.getOptionValue(option),
		index,
	});
	const focusable = (option: CategorizedOption<Option>) =>
		(!hideSelected || !option.isSelected) &&
		(props.filterOption
			? props.filterOption(
					{ label: option.label, value: option.value, data: option.data },
					props.inputValue ?? '',
				)
			: true);
	const result: CategorizedGroupOrOption<Option, Group>[] = [];
	props.options.forEach((item, outerIndex) => {
		if (typeof item === 'object' && item !== null && 'options' in item) {
			const options = item.options.map(categorize).filter(focusable);
			if (options.length) result.push({ type: 'group', data: item, options, index: outerIndex });
			return;
		}
		const option = categorize(item as Option, outerIndex);
		if (focusable(option)) result.push(option);
	});
	return result;
}

let nextInstanceId = 1;

const a11yTextStyle = {
	zIndex: 9999,
	border: 0,
	clip: 'rect(1px, 1px, 1px, 1px)',
	height: 1,
	width: 1,
	position: 'absolute',
	overflow: 'hidden',
	padding: 0,
	whiteSpace: 'nowrap',
	label: 'a11yText',
} as const;

function LiveRegion(props: { id: string; live: 'off' | 'polite' | 'assertive' }) @{
	const resolveStyle = useStyleResolver();
	const resolved = resolveStyle(a11yTextStyle);
	<>
		<span id={props.id} className={resolved.className} />
		<span
			aria-live={props.live}
			aria-atomic="false"
			aria-relevant="additions text"
			role="log"
			className={resolved.className}
		/>
	</>
}

function isAppleDevice() {
	if (typeof window === 'undefined' || window.navigator == null) return false;
	const platform = window.navigator.platform;
	const isMac = /^Mac/i.test(platform);
	return /^iPhone|^iPad/i.test(platform) || (isMac && navigator.maxTouchPoints > 1) || isMac;
}

export function Select<
	Option = unknown,
	IsMulti extends boolean = false,
	Group extends GroupBase<Option> = GroupBase<Option>,
>(inputProps: SelectProps<Option, IsMulti, Group>) @{
	const props = { ...defaultProps, ...inputProps } as RequiredSelectProps<
		Option,
		IsMulti,
		Group
	>;
	const [instancePrefix] = useState(
		() => `react-select-${props.instanceId ?? nextInstanceId++}`,
	);
	const [isFocused, setIsFocused] = useState(false);
	const [inputIsHidden, setInputIsHidden] = useState(false);
	const [appleDevice] = useState(isAppleDevice);
	const [focusedOption, setFocusedOption] = useState<Option | null>(null);
	const [focusedValue, setFocusedValue] = useState<Option | null>(null);
	const inputRef = useRef<HTMLInputElement | null>(null);
	const controlRef = useRef<HTMLDivElement | null>(null);
	const selectValue = cleanValue(props.value ?? null);
	useImperativeHandle(
		props.ref,
		() => ({
			blur: () => inputRef.current?.blur(),
			focus: () => inputRef.current?.focus(),
			getValue: () => selectValue,
		}),
		[selectValue],
	);
	const categorized = buildCategorizedOptions(props, selectValue);
	const focusableOptions = categorized.flatMap((item) =>
		item.type === 'group' ? item.options.map((option) => option.data) : [item.data],
	);
	const theme: Theme = useMemo(() => {
		if (!props.theme) return defaultTheme;
		if (typeof props.theme === 'function') return props.theme(defaultTheme);
		return { ...defaultTheme, ...props.theme };
	}, [props.theme]);
	const Components = defaultComponents({ components: props.components });
	const elementId = (part: string) => `${instancePrefix}-${part}`;
	const getStyles = (name: string, componentProps: unknown) => {
		const key = name as StyleKey;
		const base = defaultStyles[key](componentProps as never, props.unstyled);
		base.boxSizing = 'border-box';
		return props.styles[key]?.(base, componentProps) ?? base;
	};
	const getClassNames = (name: string, componentProps: unknown) =>
		props.classNames[name as StyleKey]?.(componentProps);
	const cx = (state: Record<string, boolean>, ...names: (string | undefined)[]) =>
		classNames(props.classNamePrefix, state, ...names);

	const closeMenu = () => {
		props.onInputChange('', {
			action: 'menu-close',
			prevInputValue: props.inputValue ?? '',
		});
		props.onMenuClose();
		setFocusedOption(null);
	};
	const setValue = (
		newValue: OnChangeValue<Option, IsMulti>,
		action: SetValueAction,
		option?: Option,
	) => {
		props.onInputChange('', {
			action: 'set-value',
			prevInputValue: props.inputValue ?? '',
		});
		if (props.closeMenuOnSelect) closeMenu();
		if (props.closeMenuOnSelect) setInputIsHidden(!props.isMulti);
		props.onChange(newValue, { action, option, name: props.name } as ActionMeta<Option>);
	};
	const selectOption = (option: Option) => {
		if (props.isOptionDisabled(option, selectValue)) return;
		const optionIsSelected = isSelected(props, option, selectValue);
		if (props.isMulti) {
			if (optionIsSelected) {
				setValue(
					selectValue.filter((value) => props.getOptionValue(value) !== props.getOptionValue(option)) as OnChangeValue<Option, IsMulti>,
					'deselect-option',
					option,
				);
			} else {
				setValue([...selectValue, option] as OnChangeValue<Option, IsMulti>, 'select-option', option);
			}
		} else if (!optionIsSelected) {
			setValue(option as OnChangeValue<Option, IsMulti>, 'select-option');
		}
	};
	const clearValue = () => {
		props.onChange(valueTernary(props.isMulti, [], null as Option), {
			action: 'clear',
			removedValues: selectValue,
			name: props.name,
		} as ActionMeta<Option>);
	};
	const removeValue = (removedValue: Option) => {
		const candidate = props.getOptionValue(removedValue);
		const newValue = selectValue.filter((value) => props.getOptionValue(value) !== candidate);
		props.onChange(valueTernary(props.isMulti, newValue, newValue[0] ?? null as Option), {
			action: 'remove-value',
			removedValue,
			name: props.name,
		} as ActionMeta<Option>);
	};
	const commonProps = {
		clearValue,
		cx,
		getStyles,
		getClassNames,
		getValue: () => selectValue,
		hasValue: selectValue.length > 0,
		isMulti: Boolean(props.isMulti),
		isRtl: props.isRtl,
		options: props.options,
		selectOption,
		selectProps: props as unknown as { controlShouldRenderValue: boolean } & Record<string, unknown>,
		setValue,
		theme,
	};

	const focusOption = (direction: 'first' | 'last' | 'next' | 'previous') => {
		if (!focusableOptions.length) return;
		const current = focusedOption ? focusableOptions.indexOf(focusedOption) : -1;
		const index =
			direction === 'first'
				? 0
				: direction === 'last'
					? focusableOptions.length - 1
					: direction === 'next'
						? Math.min(current + 1, focusableOptions.length - 1)
						: Math.max(current < 0 ? focusableOptions.length - 1 : current - 1, 0);
		setFocusedValue(null);
		setFocusedOption(focusableOptions[index]);
	};

	const onKeyDown = (event: KeyboardEvent) => {
		props.onKeyDown?.(event);
		if (event.defaultPrevented || props.isDisabled) return;
		switch (event.key) {
			case 'ArrowDown':
				if (props.menuIsOpen) focusOption('next');
				else props.onMenuOpen();
				break;
			case 'ArrowUp':
				if (props.menuIsOpen) focusOption('previous');
				else props.onMenuOpen();
				break;
			case 'Home':
				if (props.menuIsOpen) focusOption('first');
				else return;
				break;
			case 'End':
				if (props.menuIsOpen) focusOption('last');
				else return;
				break;
			case 'Enter':
				if (props.menuIsOpen && focusedOption) selectOption(focusedOption);
				else return;
				break;
			case 'Escape':
				if (props.menuIsOpen) closeMenu();
				else if (props.escapeClearsValue && selectValue.length) clearValue();
				else return;
				break;
			case 'Backspace':
			case 'Delete':
				if (props.inputValue) return;
				if (focusedValue) removeValue(focusedValue);
				else if (props.backspaceRemovesValue && selectValue.length) {
					if (props.isMulti) removeValue(selectValue[selectValue.length - 1]);
					else clearValue();
				}
				break;
			case 'Tab':
				if (props.tabSelectsValue && props.menuIsOpen && focusedOption) selectOption(focusedOption);
				else return;
				break;
			default:
				return;
		}
		event.preventDefault();
	};

	const formatOption = (option: Option, context: FormatOptionLabelContext) =>
		props.formatOptionLabel
			? props.formatOptionLabel(option, {
					context,
					inputValue: props.inputValue ?? '',
					selectValue,
				})
			: props.getOptionLabel(option);

	const valueUI = !selectValue.length || !props.controlShouldRenderValue
		? props.inputValue
			? null
			: <Components.Placeholder
				{...commonProps}
				isDisabled={props.isDisabled}
				isFocused={isFocused}
				innerProps={{ id: elementId('placeholder') }}
			>{props.placeholder}</Components.Placeholder>
		: props.isMulti
			? selectValue.map((option, index) => <Components.MultiValue
				{...commonProps}
				components={{
					Container: Components.MultiValueContainer,
					Label: Components.MultiValueLabel,
					Remove: Components.MultiValueRemove,
				}}
				data={option}
				index={index}
				isDisabled={props.isDisabled}
				isFocused={focusedValue === option}
				removeProps={{ onClick: () => removeValue(option) }}
			>{formatOption(option, 'value')}</Components.MultiValue>)
			: props.inputValue
				? null
				: <Components.SingleValue
					{...commonProps}
					data={selectValue[0]}
					isDisabled={props.isDisabled}
				>{formatOption(selectValue[0], 'value')}</Components.SingleValue>;

	const inputId = props.inputId || elementId('input');
	const inputUI = <Components.Input
		{...commonProps}
		autoCapitalize="none"
		autoComplete="off"
		autoCorrect="off"
		id={inputId}
		innerRef={inputRef}
		isDisabled={props.isDisabled}
		isHidden={inputIsHidden}
		onBlur={(event: FocusEvent) => {
			setIsFocused(false);
			props.onBlur?.(event);
			closeMenu();
		}}
		onInput={(event: InputEvent) => {
			const target = event.currentTarget as HTMLInputElement;
			setInputIsHidden(false);
			props.onInputChange(target.value, {
				action: 'input-change',
				prevInputValue: props.inputValue ?? '',
			});
		}}
		onFocus={(event: FocusEvent) => {
			setInputIsHidden(false);
			setIsFocused(true);
			props.onFocus?.(event);
			if (props.openMenuOnFocus) props.onMenuOpen();
		}}
		spellCheck="false"
		tabIndex={props.tabIndex}
		form={props.form}
		type="text"
		value={props.inputValue ?? ''}
		aria-autocomplete="list"
		aria-expanded={props.menuIsOpen}
		aria-haspopup="true"
		aria-errormessage={props['aria-errormessage']}
		aria-invalid={props['aria-invalid']}
		aria-label={props['aria-label']}
		aria-labelledby={props['aria-labelledby']}
		aria-required={props.required}
		role="combobox"
		aria-activedescendant={appleDevice ? undefined : focusedOption ? elementId(`option-${focusableOptions.indexOf(focusedOption)}`) : ''}
		aria-controls={props.menuIsOpen ? elementId('listbox') : undefined}
		aria-describedby={selectValue.length ? undefined : elementId('placeholder')}
	/>;

	const renderOption = (option: CategorizedOption<Option>, id: string) => {
		const optionIsFocused = focusedOption === option.data;
		return <Components.Option
			{...commonProps}
			data={option.data}
			innerRef={null}
			innerProps={{
				id: elementId(`option-${id}`),
				onClick: option.isDisabled ? undefined : () => selectOption(option.data),
				onMouseMove: option.isDisabled ? undefined : () => setFocusedOption(option.data),
				onMouseOver: option.isDisabled ? undefined : () => setFocusedOption(option.data),
				tabIndex: -1,
				role: 'option',
				'aria-selected': appleDevice ? undefined : option.isSelected,
			}}
			isDisabled={option.isDisabled}
			isFocused={optionIsFocused}
			isSelected={option.isSelected}
			label={option.label}
			type="option"
		>{formatOption(option.data, 'menu')}</Components.Option>;
	};

	let menuUI: OctaneNode = null;
	if (props.menuIsOpen) {
		const children = categorized.length
			? categorized.map((item) =>
					item.type === 'group'
						? <Components.Group
							{...commonProps}
							Heading={Components.GroupHeading}
							data={item.data}
							headingProps={{
								id: `${elementId(`group-${item.index}`)}-heading`,
								data: item.data,
							}}
							label={props.formatGroupLabel(item.data)}
							options={item.options}
						>{item.options.map((option) => renderOption(option, `${item.index}-${option.index}`))}</Components.Group>
						: renderOption(item, String(item.index)),
				)
			: props.isLoading
				? <Components.LoadingMessage {...commonProps}>{props.loadingMessage({ inputValue: props.inputValue ?? '' })}</Components.LoadingMessage>
				: <Components.NoOptionsMessage {...commonProps}>{props.noOptionsMessage({ inputValue: props.inputValue ?? '' })}</Components.NoOptionsMessage>;
		const menuElement = <Components.Menu
			{...commonProps}
			innerRef={null}
			innerProps={{
				onMouseDown: (event: MouseEvent) => {
					event.stopPropagation();
					event.preventDefault();
				},
				onMouseMove: (event: MouseEvent) => event.stopPropagation(),
			}}
			isLoading={props.isLoading}
			placement={props.menuPlacement === 'top' ? 'top' : 'bottom'}
			minMenuHeight={props.minMenuHeight}
			maxMenuHeight={props.maxMenuHeight}
			menuPlacement={props.menuPlacement}
			menuPosition={props.menuPosition}
			menuShouldScrollIntoView={props.menuShouldScrollIntoView}
		>
			<Components.MenuList
				{...commonProps}
				innerRef={null}
				innerProps={{
					role: 'listbox',
					'aria-multiselectable': Boolean(props.isMulti),
					id: elementId('listbox'),
				}}
				maxHeight={props.maxMenuHeight}
				focusedOption={focusedOption}
			>{children}</Components.MenuList>
		</Components.Menu>;
		menuUI = props.menuPortalTarget || props.menuPosition === 'fixed'
			? <Components.MenuPortal
				{...commonProps}
				appendTo={props.menuPortalTarget ?? undefined}
				controlElement={controlRef.current}
				innerProps={{}}
				menuPlacement={props.menuPlacement}
				menuPosition={props.menuPosition}
			>{menuElement}</Components.MenuPortal>
			: menuElement;
	}

	let formField: OctaneNode = null;
	if (props.name && !props.isDisabled) {
		if (props.isMulti) {
			formField = props.delimiter
				? <input name={props.name} type="hidden" value={selectValue.map(props.getOptionValue).join(props.delimiter)} />
				: <div>{selectValue.length
					? selectValue.map((option) => <input name={props.name} type="hidden" value={props.getOptionValue(option)} />)
					: <input name={props.name} type="hidden" value="" />}</div>;
		} else {
			formField = <input name={props.name} type="hidden" value={selectValue[0] ? props.getOptionValue(selectValue[0]) : ''} />;
		}
	}

	<Components.SelectContainer
		{...commonProps}
		className={props.className}
		innerProps={{ id: props.id, onKeyDown }}
		isDisabled={props.isDisabled}
		isFocused={isFocused}
	>
		<LiveRegion id={elementId('live-region')} live={props['aria-live']} />
		<Components.Control
			{...commonProps}
			innerRef={controlRef}
			innerProps={{
				onMouseDown: (event: MouseEvent) => {
					if (props.isDisabled) return;
					if (!isFocused) inputRef.current?.focus();
					if (props.openMenuOnClick) {
						if (props.menuIsOpen) closeMenu();
						else props.onMenuOpen();
					}
					event.preventDefault();
				},
			}}
			isDisabled={props.isDisabled}
			isFocused={isFocused}
			menuIsOpen={props.menuIsOpen}
		>
			<Components.ValueContainer {...commonProps} isDisabled={props.isDisabled}>
				{valueUI}
				{inputUI}
			</Components.ValueContainer>
			<Components.IndicatorsContainer {...commonProps} isDisabled={props.isDisabled}>
				{(props.isClearable ?? Boolean(props.isMulti)) && selectValue.length && !props.isDisabled && !props.isLoading
					? <Components.ClearIndicator
						{...commonProps}
						innerProps={{ 'aria-hidden': 'true', onMouseDown: clearValue }}
						isDisabled={props.isDisabled}
						isFocused={isFocused}
					/>
					: null}
				{props.isLoading ? <Components.LoadingIndicator
					{...commonProps}
					innerProps={{ 'aria-hidden': 'true' }}
					isDisabled={props.isDisabled}
					isFocused={isFocused}
				/> : null}
				{Components.DropdownIndicator && Components.IndicatorSeparator
					? <Components.IndicatorSeparator
						{...commonProps}
						isDisabled={props.isDisabled}
						isFocused={isFocused}
					/>
					: null}
				{Components.DropdownIndicator ? <Components.DropdownIndicator
					{...commonProps}
					innerProps={{ 'aria-hidden': 'true' }}
					isDisabled={props.isDisabled}
					isFocused={isFocused}
				/> : null}
			</Components.IndicatorsContainer>
		</Components.Control>
		{menuUI}
		{formField}
	</Components.SelectContainer>
}

export type PublicBaseSelectProps<
	Option,
	IsMulti extends boolean,
	Group extends GroupBase<Option>,
> = SelectProps<Option, IsMulti, Group>;

export const baseComponents = builtinComponents;
