// @vitest-environment jsdom

import { cleanup, fireEvent, render } from '@octanejs/testing-library';
import { createElement } from 'octane';
import { afterEach, expect, vi } from 'vitest';

import { Select } from '../../src/select.tsrx';
import { hiddenInput, inputFor, OPTIONS, optionTexts, type Option, upstreamTest } from './helpers';

afterEach(cleanup);

interface NumberOption {
	readonly label: string;
	readonly value: number;
}

const NUMBER_OPTIONS: readonly NumberOption[] = [
	{ label: '0', value: 0 },
	{ label: '1', value: 1 },
	{ label: '2', value: 2 },
	{ label: '3', value: 3 },
];

interface BooleanOption {
	readonly label: string;
	readonly value: boolean;
}

const BOOLEAN_OPTIONS: readonly BooleanOption[] = [
	{ label: 'true', value: true },
	{ label: 'false', value: false },
];

const ACCENTED_OPTIONS: readonly Option[] = [
	{ label: 'school', value: 'en' },
	{ label: 'école', value: 'fr' },
];

function basicProps(overrides: Record<string, unknown> = {}): never {
	return {
		className: 'react-select',
		classNamePrefix: 'react-select',
		inputValue: '',
		name: 'test-input-name',
		onChange: vi.fn(),
		onInputChange: vi.fn(),
		onMenuClose: vi.fn(),
		onMenuOpen: vi.fn(),
		options: OPTIONS,
		value: null,
		...overrides,
	} as never;
}

function renderSelect(overrides: Record<string, unknown> = {}) {
	return render(Select, { props: basicProps(overrides) });
}

function menu(container: HTMLElement): Element | null {
	return container.querySelector('.react-select__menu');
}

upstreamTest(
	'instanceId prop > to have instanceId as id prefix for the select components',
	function appliesInstanceId() {
		const result = renderSelect({ instanceId: 'custom-id', menuIsOpen: true });
		expect(inputFor(result.container).id).toContain('custom-id');
		const options = result.container.querySelectorAll<HTMLElement>('.react-select__option');
		for (const option of options) expect(option.id).toContain('custom-id');
	},
);

upstreamTest(
	'hidden input field is not present if name is not passes',
	function omitsUnnamedInput() {
		const result = renderSelect({ name: undefined });
		expect(result.container.querySelector('input[type="hidden"]')).toBeNull();
	},
);

upstreamTest('hidden input field is present if name passes', function rendersNamedInput() {
	const result = renderSelect();
	expect(result.container.querySelector('input[type="hidden"]')).toBeTruthy();
});

upstreamTest(
	'single select > passing multiple values > should select the first value',
	function selectsFirstValue() {
		const result = renderSelect({ value: [OPTIONS[0], OPTIONS[4]] });
		expect(result.container.querySelector('.react-select__control')?.textContent).toBe('0');
	},
);

upstreamTest('isRtl boolean prop sets direction: rtl on container', function appliesRtlDirection() {
	const result = renderSelect({ isClearable: true, isRtl: true, value: [OPTIONS[0]] });
	expect(window.getComputedStyle(result.container.firstChild as HTMLElement).direction).toBe('rtl');
});

upstreamTest(
	'isOptionSelected() prop > single select > mark value as isSelected if isOptionSelected returns true for the option',
	function marksCustomSelectedOption() {
		function isOptionSelected(option: Option): boolean {
			return option.label !== '1';
		}
		const result = renderSelect({ isOptionSelected, menuIsOpen: true });
		const options = result.container.querySelectorAll<HTMLElement>('.react-select__option');
		expect(options[0].classList).toContain('react-select__option--is-selected');
		expect(options[1].classList).not.toContain('react-select__option--is-selected');
	},
);

upstreamTest(
	'isOptionSelected() prop > multi select > to not show the selected options in Menu for multiSelect',
	function hidesCustomSelectedOptions() {
		function isOptionSelected(option: Option): boolean {
			return option.label !== '1';
		}
		const result = renderSelect({ isMulti: true, isOptionSelected, menuIsOpen: true });
		expect(optionTexts(result.container)).toEqual(['1']);
	},
);

function assertFormattedOption(isMulti: boolean): void {
	function formatOptionLabel(option: Option, meta: { context: string }): string {
		return `${option.label} ${option.value} ${meta.context}`;
	}
	const result = renderSelect({ formatOptionLabel, isMulti, value: OPTIONS[0] });
	const selector = isMulti ? '.react-select__multi-value' : '.react-select__single-value';
	expect(result.container.querySelector(selector)?.textContent).toBe('0 zero value');
}

upstreamTest(
	'formatOptionLabel single select > should format label of options according to text returned by formatOptionLabel',
	function formatsSingleOption() {
		assertFormattedOption(false);
	},
);

upstreamTest(
	'formatOptionLabel multi select > should format label of options according to text returned by formatOptionLabel',
	function formatsMultiOption() {
		assertFormattedOption(true);
	},
);

upstreamTest('name prop single select > should assign the given name', function namesSingleInput() {
	const result = renderSelect({ name: 'form-field-single-select' });
	expect(hiddenInput(result.container).name).toBe('form-field-single-select');
});

upstreamTest('name prop multi select > should assign the given name', function namesMultiInput() {
	const result = renderSelect({
		isMulti: true,
		name: 'form-field-multi-select',
		value: OPTIONS[2],
	});
	expect(hiddenInput(result.container).name).toBe('form-field-multi-select');
});

function assertControlledMenu(isMulti: boolean): void {
	const result = renderSelect({ isMulti });
	expect(menu(result.container)).toBeNull();
	result.rerender({ props: basicProps({ isMulti, menuIsOpen: true }) });
	expect(menu(result.container)).toBeTruthy();
	result.rerender({ props: basicProps({ isMulti }) });
	expect(menu(result.container)).toBeNull();
}

upstreamTest(
	'menuIsOpen prop single select > should show menu if menuIsOpen is true and hide menu if menuIsOpen prop is false',
	function controlsSingleMenu() {
		assertControlledMenu(false);
	},
);

upstreamTest(
	'menuIsOpen prop multi select > should show menu if menuIsOpen is true and hide menu if menuIsOpen prop is false',
	function controlsMultiMenu() {
		assertControlledMenu(true);
	},
);

function assertDefaultFilter(search: string): void {
	const result = renderSelect({ menuIsOpen: true, options: ACCENTED_OPTIONS });
	result.rerender({
		props: basicProps({ inputValue: search, menuIsOpen: true, options: ACCENTED_OPTIONS }),
	});
	expect(optionTexts(result.container)).toHaveLength(1);
}

upstreamTest(
	'filterOption() prop - default filter behavior single select > should match accented char',
	function matchesAccentedOption() {
		assertDefaultFilter('ecole');
	},
);

upstreamTest(
	'filterOption() prop - default filter behavior single select > should ignore accented char in query',
	function ignoresQueryAccent() {
		assertDefaultFilter('schoöl');
	},
);

function customFilter(option: { value: string }, search: string): boolean {
	return option.value.includes(search);
}

function assertCustomFilter(isMulti: boolean, expected: number): void {
	const result = renderSelect({
		filterOption: customFilter,
		isMulti,
		menuIsOpen: true,
		value: OPTIONS[0],
	});
	result.rerender({
		props: basicProps({
			filterOption: customFilter,
			inputValue: 'o',
			isMulti,
			menuIsOpen: true,
			value: OPTIONS[0],
		}),
	});
	expect(optionTexts(result.container)).toHaveLength(expected);
}

upstreamTest(
	'filterOption() prop - should filter only if function returns truthy for value single select > should filter all options as per searchString',
	function filtersSingleOptions() {
		assertCustomFilter(false, 5);
	},
);

upstreamTest(
	'filterOption() prop - should filter only if function returns truthy for value multi select > should filter all options other that options in value of select',
	function filtersMultiOptions() {
		assertCustomFilter(true, 4);
	},
);

function assertNullFilter(isMulti: boolean, expected: number): void {
	const result = renderSelect({
		filterOption: null,
		isMulti,
		menuIsOpen: true,
		value: OPTIONS[0],
	});
	result.rerender({
		props: basicProps({
			filterOption: null,
			inputValue: 'o',
			isMulti,
			menuIsOpen: true,
			value: OPTIONS[0],
		}),
	});
	expect(optionTexts(result.container)).toHaveLength(expected);
}

upstreamTest(
	'filterOption prop is null single select > should show all the options',
	function showsAllSingleOptions() {
		assertNullFilter(false, 17);
	},
);

upstreamTest(
	'filterOption prop is null multi select > should show all the options other than selected options',
	function showsUnselectedMultiOptions() {
		assertNullFilter(true, 16);
	},
);

function assertNoOptions(isMulti: boolean, message: string): void {
	function noOptionsMessage(): string {
		return message;
	}
	const result = renderSelect({
		filterOption: customFilter,
		inputValue: 'some text not in options',
		isMulti,
		menuIsOpen: true,
		noOptionsMessage,
	});
	const notice = result.container.querySelector('.react-select__menu-notice--no-options');
	expect(notice?.textContent).toBe(message);
}

upstreamTest(
	'no option found on search based on filterOption prop single Select > should show NoOptionsMessage',
	function showsSingleNoOptions() {
		assertNoOptions(false, 'No options');
	},
);

upstreamTest(
	'no option found on search based on filterOption prop multi select > should show NoOptionsMessage',
	function showsMultiNoOptions() {
		assertNoOptions(true, 'No options');
	},
);

upstreamTest(
	'noOptionsMessage() function prop single Select > should show NoOptionsMessage returned from noOptionsMessage function prop',
	function showsCustomSingleNoOptions() {
		assertNoOptions(false, 'this is custom no option message for single select');
	},
);

upstreamTest(
	'noOptionsMessage() function prop multi select > should show NoOptionsMessage returned from noOptionsMessage function prop',
	function showsCustomMultiNoOptions() {
		assertNoOptions(true, 'this is custom no option message for multi select');
	},
);

function assertUpdatedValue(
	isMulti: boolean,
	options: readonly unknown[],
	initial: unknown,
	updated: unknown,
	initialValue: string,
	updatedValue: string,
	delimiter?: string,
): void {
	const result = renderSelect({ delimiter, isMulti, options, value: initial });
	expect(hiddenInput(result.container).value).toBe(initialValue);
	result.rerender({ props: basicProps({ delimiter, isMulti, options, value: updated }) });
	expect(hiddenInput(result.container).value).toBe(updatedValue);
}

upstreamTest(
	'update the value prop single select > should update the value when prop is updated',
	function updatesSingleValue() {
		assertUpdatedValue(false, OPTIONS, OPTIONS[1], OPTIONS[3], 'one', 'three');
	},
);

upstreamTest(
	'update the value prop single select > value of options is number > should update the value when prop is updated',
	function updatesNumericSingleValue() {
		assertUpdatedValue(false, NUMBER_OPTIONS, NUMBER_OPTIONS[2], NUMBER_OPTIONS[3], '2', '3');
	},
);

upstreamTest(
	'update the value prop multi select > should update the value when prop is updated',
	function updatesMultiValue() {
		assertUpdatedValue(true, OPTIONS, OPTIONS[1], OPTIONS[3], 'one', 'three');
	},
);

upstreamTest(
	'update the value prop multi select > value of options is number > should update the value when prop is updated',
	function updatesNumericMultiValue() {
		assertUpdatedValue(
			true,
			NUMBER_OPTIONS,
			NUMBER_OPTIONS[2],
			[NUMBER_OPTIONS[3], NUMBER_OPTIONS[2]],
			'2',
			'3,2',
			',',
		);
	},
);

function assertAutoFocus(isMulti: boolean): void {
	const result = renderSelect({ autoFocus: true, isMulti });
	expect(inputFor(result.container)).toBe(document.activeElement);
}

upstreamTest(
	'autoFocus single select > should focus select on mount',
	function focusesSingleSelect() {
		assertAutoFocus(false);
	},
);

upstreamTest(
	'autoFocus multi select > should focus select on mount',
	function focusesMultiSelect() {
		assertAutoFocus(true);
	},
);

function assertAutoFocusCallback(isMulti: boolean): void {
	const onFocus = vi.fn();
	const result = renderSelect({ autoFocus: true, isMulti, onFocus });
	expect(inputFor(result.container)).toBe(document.activeElement);
	expect(onFocus).toHaveBeenCalledTimes(1);
}

upstreamTest(
	'onFocus prop with autoFocus single select > should call auto focus only once when select is autoFocus',
	function callsSingleAutoFocus() {
		assertAutoFocusCallback(false);
	},
);

upstreamTest(
	'onFocus prop with autoFocus multi select > should call auto focus only once when select is autoFocus',
	function callsMultiAutoFocus() {
		assertAutoFocusCallback(true);
	},
);

function assertFocusCallback(isMulti: boolean): void {
	const onFocus = vi.fn();
	const result = renderSelect({ isMulti, onFocus });
	fireEvent.focus(inputFor(result.container));
	expect(onFocus).toHaveBeenCalledTimes(1);
}

upstreamTest(
	'onFocus prop is called on on focus of input single select > should call onFocus handler on focus on input',
	function callsSingleFocus() {
		assertFocusCallback(false);
	},
);

upstreamTest(
	'onFocus prop is called on on focus of input multi select > should call onFocus handler on focus on input',
	function callsMultiFocus() {
		assertFocusCallback(true);
	},
);

function assertBlurCallback(isMulti: boolean): void {
	const onBlur = vi.fn();
	const result = renderSelect({ isMulti, onBlur });
	fireEvent.blur(inputFor(result.container));
	expect(onBlur).toHaveBeenCalledTimes(1);
}

upstreamTest(
	'onBlur prop single select > should call onBlur handler on blur on input',
	function callsSingleBlur() {
		assertBlurCallback(false);
	},
);

upstreamTest(
	'onBlur prop multi select > should call onBlur handler on blur on input',
	function callsMultiBlur() {
		assertBlurCallback(true);
	},
);

upstreamTest(
	'onInputChange() function prop to be called on blur',
	function callsInputChangeOnBlur() {
		const onInputChange = vi.fn();
		const result = renderSelect({ onInputChange });
		fireEvent.blur(inputFor(result.container));
		expect(onInputChange).toHaveBeenCalledTimes(2);
	},
);

upstreamTest('onMenuClose() function prop to be called on blur', function callsMenuCloseOnBlur() {
	const onMenuClose = vi.fn();
	const result = renderSelect({ onMenuClose });
	fireEvent.blur(inputFor(result.container));
	expect(onMenuClose).toHaveBeenCalledTimes(1);
});

function assertPlaceholder(isMulti: boolean, placeholder?: unknown): void {
	const result =
		placeholder === undefined ? renderSelect({ isMulti }) : renderSelect({ isMulti, placeholder });
	expect(result.container.querySelector('.react-select__control')?.textContent).toBe(
		placeholder === undefined ? 'Select...' : 'single Select...',
	);
}

upstreamTest(
	'placeholder single select > should display default placeholder "Select..."',
	function showsSingleDefaultPlaceholder() {
		assertPlaceholder(false);
	},
);

upstreamTest(
	'placeholder single select > should display provided string placeholder',
	function showsSingleStringPlaceholder() {
		assertPlaceholder(false, 'single Select...');
	},
);

upstreamTest(
	'placeholder single select > should display provided node placeholder',
	function showsSingleNodePlaceholder() {
		assertPlaceholder(false, createElement('span', null, 'single Select...'));
	},
);

upstreamTest(
	'placeholder multi select > should display default placeholder "Select..."',
	function showsMultiDefaultPlaceholder() {
		assertPlaceholder(true);
	},
);

upstreamTest(
	'placeholder multi select > should display provided placeholder',
	function showsMultiPlaceholder() {
		const result = renderSelect({ isMulti: true, placeholder: 'multi Select...' });
		expect(result.container.querySelector('.react-select__control')?.textContent).toBe(
			'multi Select...',
		);
	},
);

function assertPlaceholderAfterRemoval(isMulti: boolean): void {
	const result = renderSelect({ isMulti, value: OPTIONS[0] });
	expect(result.container.querySelector('.react-select__placeholder')).toBeNull();
	result.rerender({ props: basicProps({ isMulti, value: null }) });
	expect(result.container.querySelector('.react-select__placeholder')).toBeTruthy();
}

upstreamTest(
	'display placeholder once value is removed single select > should display placeholder once the value is removed from select',
	function showsSinglePlaceholderAfterRemoval() {
		assertPlaceholderAfterRemoval(false);
	},
);

upstreamTest(
	'display placeholder once value is removed multi select > should display placeholder once the value is removed from select',
	function showsMultiPlaceholderAfterRemoval() {
		assertPlaceholderAfterRemoval(true);
	},
);

upstreamTest('sets inputMode="none" when isSearchable is false', function setsNonSearchInputMode() {
	const result = renderSelect({ isSearchable: false });
	const input = result.container.querySelector<HTMLInputElement>(
		'.react-select__value-container input',
	);
	if (!input) throw new Error('Expected dummy input');
	expect(input.inputMode).toBe('none');
	expect(window.getComputedStyle(input).caretColor).toBe('rgba(0, 0, 0, 0)');
});

function assertDisabledClick(isMulti: boolean): void {
	const onChange = vi.fn();
	const options = [
		{ label: 'option 1', value: 'opt1' },
		{ label: 'option 2', value: 'opt2', isDisabled: true },
	];
	const result = renderSelect({ isMulti, menuIsOpen: true, onChange, options });
	const disabled = Array.from(
		result.container.querySelectorAll<HTMLElement>('.react-select__option'),
	).find(function findDisabled(option) {
		return option.textContent === 'option 2';
	});
	if (!disabled) throw new Error('Expected disabled option');
	fireEvent.click(disabled);
	expect(onChange).not.toHaveBeenCalled();
}

upstreamTest(
	'clicking on disabled option single select > should not select the disabled option',
	function ignoresSingleDisabledClick() {
		assertDisabledClick(false);
	},
);

upstreamTest(
	'clicking on disabled option multi select > should not select the disabled option',
	function ignoresMultiDisabledClick() {
		assertDisabledClick(true);
	},
);

function assertNotClearable(isMulti: boolean): void {
	const result = renderSelect({ isClearable: false, isMulti, value: [OPTIONS[0]] });
	expect(result.container.querySelector('.react-select__clear-indicator')).toBeNull();
}

upstreamTest(
	'isClearable is false single select > should not show the X (clear) button',
	function hidesSingleClearButton() {
		assertNotClearable(false);
	},
);

upstreamTest('isClearable is false test-input-name', function hidesMultiClearButton() {
	assertNotClearable(true);
});

upstreamTest('getOptionLabel() prop > to format the option label', function formatsOptionLabel() {
	function getOptionLabel(option: Option): string {
		return `This a custom option ${option.label} label`;
	}
	const result = renderSelect({ getOptionLabel, menuIsOpen: true });
	expect(optionTexts(result.container)[0]).toBe('This a custom option 0 label');
});

interface GroupOption {
	readonly value: number;
	readonly label: string;
}

interface OptionGroup {
	readonly label: string;
	readonly options: readonly GroupOption[];
}

const GROUPS: readonly OptionGroup[] = [
	{
		label: 'group 1',
		options: [
			{ value: 1, label: '1' },
			{ value: 2, label: '2' },
		],
	},
	{
		label: 'group 2',
		options: [
			{ value: 3, label: '3' },
			{ value: 4, label: '4' },
		],
	},
];

upstreamTest(
	'formatGroupLabel function prop > to format Group label',
	function formatsGroupLabel() {
		function formatGroupLabel(group: OptionGroup): string {
			return `This is custom ${group.label} header`;
		}
		const result = renderSelect({ formatGroupLabel, menuIsOpen: true, options: GROUPS });
		expect(result.container.querySelector('.react-select__group-heading')?.textContent).toBe(
			'This is custom group 1 header',
		);
	},
);

upstreamTest(
	'to only render groups with at least one match when filtering',
	function filtersEmptyGroups() {
		const result = renderSelect({ inputValue: '1', menuIsOpen: true, options: GROUPS });
		const groups = result.container.querySelectorAll('.react-select__group');
		expect(groups).toHaveLength(1);
		expect(groups[0].querySelectorAll('.react-select__option')).toHaveLength(1);
	},
);

upstreamTest(
	'not render any groups when there is not a single match when filtering',
	function omitsAllEmptyGroups() {
		const result = renderSelect({ inputValue: '5', menuIsOpen: true, options: GROUPS });
		expect(result.container.querySelectorAll('.react-select__group')).toHaveLength(0);
	},
);

upstreamTest(
	'multi select > have default value delimiter seperated',
	function joinsDefaultDelimiter() {
		const result = renderSelect({
			delimiter: ';',
			isMulti: true,
			value: [OPTIONS[0], OPTIONS[1]],
		});
		expect(hiddenInput(result.container).value).toBe('zero;one');
	},
);

upstreamTest('multi select > with multi character delimiter', function joinsMultiDelimiter() {
	const result = renderSelect({
		delimiter: '===&===',
		isMulti: true,
		value: [OPTIONS[0], OPTIONS[1]],
	});
	expect(hiddenInput(result.container).value).toBe('zero===&===one');
});

upstreamTest(
	'multi select > removes the selected option from the menu options when isSearchable is false',
	function removesSelectedMenuOption() {
		const result = renderSelect({
			delimiter: ',',
			isMulti: true,
			isSearchable: false,
			menuIsOpen: true,
		});
		expect(optionTexts(result.container)).toHaveLength(17);
		result.rerender({
			props: basicProps({
				delimiter: ',',
				isMulti: true,
				isSearchable: false,
				menuIsOpen: true,
				value: OPTIONS[0],
			}),
		});
		expect(optionTexts(result.container)).toHaveLength(16);
		expect(optionTexts(result.container)).not.toContain('0');
	},
);

upstreamTest(
	'hitting ArrowUp key on closed select should focus last element',
	function focusesLastOption() {
		const result = renderSelect({ menuIsOpen: true });
		const control = result.container.querySelector<HTMLElement>('.react-select__control');
		if (!control) throw new Error('Expected select control');
		fireEvent.keyDown(control, { keyCode: 38, key: 'ArrowUp' });
		expect(result.container.querySelector('.react-select__option--is-focused')?.textContent).toBe(
			'16',
		);
	},
);

function assertEscapeDoesNotClear(escapeClearsValue: boolean, isClearable: boolean): void {
	const onChange = vi.fn();
	const result = renderSelect({
		escapeClearsValue,
		isClearable,
		onChange,
		value: OPTIONS[0],
	});
	const root = result.container.querySelector<HTMLElement>('.react-select');
	if (!root) throw new Error('Expected select root');
	fireEvent.keyDown(root, { keyCode: 27, key: 'Escape' });
	expect(onChange).not.toHaveBeenCalled();
}

upstreamTest(
	'to not clear value when hitting escape if escapeClearsValue is false (default) and isClearable is false',
	function keepsNonClearableDefaultEscape() {
		assertEscapeDoesNotClear(false, false);
	},
);

upstreamTest(
	'to not clear value when hitting escape if escapeClearsValue is false (default) and isClearable is true',
	function keepsClearableDefaultEscape() {
		assertEscapeDoesNotClear(false, true);
	},
);

upstreamTest(
	'hitting spacebar should not select option if isSearchable is true (default)',
	function ignoresSearchableSpace() {
		const onChange = vi.fn();
		const result = renderSelect({ menuIsOpen: true, onChange });
		fireEvent.keyDown(result.container, { keyCode: 32, key: ' ' });
		expect(onChange).not.toHaveBeenCalled();
	},
);

function optionWithText(container: HTMLElement, label: string): HTMLElement {
	const option = Array.from(container.querySelectorAll<HTMLElement>('.react-select__option')).find(
		function matchesLabel(candidate) {
			return candidate.textContent === label;
		},
	);
	if (!option) throw new Error(`Expected option ${label}`);
	return option;
}

function assertSelectedOption(
	isMulti: boolean,
	options: readonly unknown[],
	label: string,
	expectedOption: unknown,
): void {
	const onChange = vi.fn();
	const result = renderSelect({ isMulti, menuIsOpen: true, onChange, options });
	fireEvent.click(optionWithText(result.container, label));
	expect(onChange).toHaveBeenCalledWith(isMulti ? [expectedOption] : expectedOption, {
		action: 'select-option',
		name: 'test-input-name',
		...(isMulti ? { option: expectedOption } : {}),
	});
}

upstreamTest(
	'calls onChange on selecting an option single select > option is clicked > should call onChange() prop with selected option',
	function selectsClickedSingleOption() {
		assertSelectedOption(false, OPTIONS, '2', OPTIONS[2]);
	},
);

upstreamTest(
	'calls onChange on selecting an option single select > option with number value > option is clicked > should call onChange() prop with selected option',
	function selectsClickedNumberOption() {
		assertSelectedOption(false, NUMBER_OPTIONS, '0', NUMBER_OPTIONS[0]);
	},
);

upstreamTest(
	'calls onChange on selecting an option single select > option with boolean value > option is clicked > should call onChange() prop with selected option',
	function selectsClickedBooleanOption() {
		assertSelectedOption(false, BOOLEAN_OPTIONS, 'true', BOOLEAN_OPTIONS[0]);
	},
);

upstreamTest(
	'calls onChange on selecting an option multi select > option is clicked > should call onChange() prop with selected option',
	function selectsClickedMultiOption() {
		assertSelectedOption(true, OPTIONS, '2', OPTIONS[2]);
	},
);

upstreamTest(
	'calls onChange on selecting an option multi select > option with number value > option is clicked > should call onChange() prop with selected option',
	function selectsClickedMultiNumberOption() {
		assertSelectedOption(true, NUMBER_OPTIONS, '0', NUMBER_OPTIONS[0]);
	},
);

upstreamTest(
	'calls onChange on selecting an option multi select > option with boolean value > option is clicked > should call onChange() prop with selected option',
	function selectsClickedMultiBooleanOption() {
		assertSelectedOption(true, BOOLEAN_OPTIONS, 'true', BOOLEAN_OPTIONS[0]);
	},
);

function assertDeselectedOption(options: readonly unknown[], label: string, value: unknown): void {
	const onChange = vi.fn();
	const result = renderSelect({
		hideSelectedOptions: false,
		isMulti: true,
		menuIsOpen: true,
		onChange,
		options,
		value: [value],
	});
	fireEvent.click(optionWithText(result.container, label));
	expect(onChange).toHaveBeenCalledWith([], {
		action: 'deselect-option',
		name: 'test-input-name',
		option: value,
	});
}

upstreamTest(
	'calls onChange on de-selecting an option in multi select option is clicked > should call onChange() prop with correct selected options and meta',
	function deselectsClickedOption() {
		assertDeselectedOption(OPTIONS, '2', OPTIONS[2]);
	},
);

upstreamTest(
	'calls onChange on de-selecting an option in multi select option with number value > option is clicked > should call onChange() prop with selected option',
	function deselectsClickedNumberOption() {
		assertDeselectedOption(NUMBER_OPTIONS, '0', NUMBER_OPTIONS[0]);
	},
);

upstreamTest(
	'calls onChange on de-selecting an option in multi select option with boolean value > option is clicked > should call onChange() prop with selected option',
	function deselectsClickedBooleanOption() {
		assertDeselectedOption(BOOLEAN_OPTIONS, 'true', BOOLEAN_OPTIONS[0]);
	},
);

function assertMenuIndicator(isMulti: boolean, menuIsOpen: boolean): void {
	const callback = vi.fn();
	const callbackProps = menuIsOpen ? { onMenuClose: callback } : { onMenuOpen: callback };
	const result = renderSelect({ ...callbackProps, isMulti, menuIsOpen });
	const indicator = result.container.querySelector<HTMLElement>(
		'.react-select__dropdown-indicator',
	);
	if (!indicator) throw new Error('Expected dropdown indicator');
	fireEvent.mouseDown(indicator, { button: 0 });
	expect(callback).toHaveBeenCalled();
}

upstreamTest(
	'Clicking dropdown indicator on select with closed menu with primary button on mouse single select > should call onMenuOpen prop when select is opened and onMenuClose prop when select is closed',
	function opensSingleMenuFromIndicator() {
		assertMenuIndicator(false, false);
	},
);

upstreamTest(
	'Clicking dropdown indicator on select with closed menu with primary button on mouse multi select > should call onMenuOpen prop when select is opened and onMenuClose prop when select is closed',
	function opensMultiMenuFromIndicator() {
		assertMenuIndicator(true, false);
	},
);

upstreamTest(
	'Clicking dropdown indicator on select with open menu with primary button on mouse single select > should call onMenuOpen prop when select is opened and onMenuClose prop when select is closed',
	function closesSingleMenuFromIndicator() {
		assertMenuIndicator(false, true);
	},
);

upstreamTest(
	'Clicking dropdown indicator on select with open menu with primary button on mouse multi select > should call onMenuOpen prop when select is opened and onMenuClose prop when select is closed',
	function closesMultiMenuFromIndicator() {
		assertMenuIndicator(true, true);
	},
);

function assertHiddenValue(
	isMulti: boolean,
	options: readonly unknown[],
	value: unknown,
	expected: string,
	delimiter?: string,
): void {
	const result = renderSelect({ delimiter, isMulti, options, value });
	expect(hiddenInput(result.container).value).toBe(expected);
}

upstreamTest(
	'value of hidden input control single select > should set value of input as value prop',
	function serializesSingleStringValue() {
		assertHiddenValue(false, OPTIONS, OPTIONS[3], 'three');
	},
);

upstreamTest(
	'value of hidden input control single select > options with number values > should set value of input as value prop',
	function serializesSingleNumberValue() {
		assertHiddenValue(false, NUMBER_OPTIONS, NUMBER_OPTIONS[3], '3');
	},
);

upstreamTest(
	'value of hidden input control single select > options with boolean values > should set value of input as value prop',
	function serializesSingleBooleanValue() {
		assertHiddenValue(false, BOOLEAN_OPTIONS, BOOLEAN_OPTIONS[1], 'false');
	},
);

upstreamTest(
	'value of hidden input control multi select > should set value of input as value prop',
	function serializesMultiStringValue() {
		assertHiddenValue(true, OPTIONS, OPTIONS[3], 'three');
	},
);

upstreamTest(
	'value of hidden input control multi select > with delimiter prop > should set value of input as value prop',
	function serializesDelimitedStringValues() {
		assertHiddenValue(true, OPTIONS, [OPTIONS[3], OPTIONS[5]], 'three, five', ', ');
	},
);

upstreamTest(
	'value of hidden input control multi select > options with number values > should set value of input as value prop',
	function serializesMultiNumberValue() {
		assertHiddenValue(true, NUMBER_OPTIONS, NUMBER_OPTIONS[3], '3');
	},
);

upstreamTest(
	'value of hidden input control multi select > with delimiter prop > options with number values > should set value of input as value prop',
	function serializesDelimitedNumberValues() {
		assertHiddenValue(true, NUMBER_OPTIONS, [NUMBER_OPTIONS[3], NUMBER_OPTIONS[1]], '3, 1', ', ');
	},
);

upstreamTest(
	'value of hidden input control multi select > options with boolean values > should set value of input as value prop',
	function serializesMultiBooleanValue() {
		assertHiddenValue(true, BOOLEAN_OPTIONS, BOOLEAN_OPTIONS[1], 'false');
	},
);

upstreamTest(
	'value of hidden input control multi select > with delimiter prop > options with boolean values > should set value of input as value prop',
	function serializesDelimitedBooleanValues() {
		assertHiddenValue(
			true,
			BOOLEAN_OPTIONS,
			[BOOLEAN_OPTIONS[1], BOOLEAN_OPTIONS[0]],
			'false, true',
			', ',
		);
	},
);

function isOptionDisabled(option: Option): boolean {
	return ['zero', 'two', 'five', 'ten'].includes(option.value);
}

function assertDisabledOptions(isMulti: boolean): void {
	const result = renderSelect({ isMulti, isOptionDisabled, menuIsOpen: true });
	const disabled = Array.from(
		result.container.querySelectorAll<HTMLElement>('.react-select__option--is-disabled'),
		function optionText(option) {
			return option.textContent;
		},
	);
	expect(disabled).toContain('0');
	expect(disabled).toContain('2');
	expect(disabled).toContain('5');
	expect(disabled).toContain('10');
	expect(disabled).not.toContain('1');
}

upstreamTest(
	'isOptionDisabled() prop single select > should add isDisabled as true prop only to options that are disabled',
	function marksSingleDisabledOptions() {
		assertDisabledOptions(false);
	},
);

upstreamTest(
	'isOptionDisabled() prop multi select > should add isDisabled as true prop only to options that are disabled',
	function marksMultiDisabledOptions() {
		assertDisabledOptions(true);
	},
);

function assertDisabledSelect(isMulti: boolean): void {
	const result = renderSelect({ isDisabled: true, isMulti });
	expect(result.container.querySelector('.react-select__control')?.classList).toContain(
		'react-select__control--is-disabled',
	);
	const input = result.container.querySelector<HTMLInputElement>('.react-select__control input');
	expect(input?.disabled).toBe(true);
}

upstreamTest(
	'isDisabled prop single select > should add isDisabled prop to select components',
	function disablesSingleSelect() {
		assertDisabledSelect(false);
	},
);

upstreamTest(
	'isDisabled prop multi select > should add isDisabled prop to select components',
	function disablesMultiSelect() {
		assertDisabledSelect(true);
	},
);

upstreamTest(
	'multi select > to not show selected value in options',
	function hidesSelectedMultiValue() {
		const result = renderSelect({ isMulti: true, menuIsOpen: true });
		expect(optionTexts(result.container)).toContain('0');
		result.rerender({
			props: basicProps({ isMulti: true, menuIsOpen: true, value: OPTIONS[0] }),
		});
		expect(optionTexts(result.container)).not.toContain('0');
	},
);

upstreamTest(
	'multi select > to not hide the selected options from the menu if hideSelectedOptions is false',
	function showsSelectedMultiValue() {
		const result = renderSelect({
			hideSelectedOptions: false,
			isMulti: true,
			menuIsOpen: true,
			value: OPTIONS[0],
		});
		expect(optionTexts(result.container)).toContain('0');
	},
);

function selectControl(container: HTMLElement): HTMLElement {
	const control = container.querySelector<HTMLElement>('.react-select__control');
	if (!control) throw new Error('Expected select control');
	return control;
}

upstreamTest(
	'multi select > call onChange with all values but last selected value and remove event on hitting backspace',
	function popsLastMultiValue() {
		const onChange = vi.fn();
		const result = renderSelect({
			isMulti: true,
			onChange,
			value: [OPTIONS[0], OPTIONS[1], OPTIONS[2]],
		});
		fireEvent.keyDown(selectControl(result.container), { keyCode: 8, key: 'Backspace' });
		expect(onChange).toHaveBeenCalledWith([OPTIONS[0], OPTIONS[1]], {
			action: 'pop-value',
			name: 'test-input-name',
			removedValue: OPTIONS[2],
		});
	},
);

upstreamTest(
	'should not call onChange on hitting backspace when backspaceRemovesValue is false',
	function ignoresDisabledBackspaceRemoval() {
		const onChange = vi.fn();
		const result = renderSelect({ backspaceRemovesValue: false, onChange });
		fireEvent.keyDown(selectControl(result.container), { keyCode: 8, key: 'Backspace' });
		expect(onChange).not.toHaveBeenCalled();
	},
);

upstreamTest(
	'should not call onChange on hitting backspace even when backspaceRemovesValue is true if isClearable is false',
	function ignoresNonClearableBackspace() {
		const onChange = vi.fn();
		const result = renderSelect({ backspaceRemovesValue: true, isClearable: false, onChange });
		fireEvent.keyDown(selectControl(result.container), { keyCode: 8, key: 'Backspace' });
		expect(onChange).not.toHaveBeenCalled();
	},
);

upstreamTest(
	'should call onChange with an array on hitting backspace when backspaceRemovesValue is true and isMulti is true',
	function popsMultiValueOnBackspace() {
		const onChange = vi.fn();
		const result = renderSelect({
			backspaceRemovesValue: true,
			isClearable: true,
			isMulti: true,
			onChange,
			value: [OPTIONS[0]],
		});
		fireEvent.keyDown(selectControl(result.container), { keyCode: 8, key: 'Backspace' });
		expect(onChange).toHaveBeenCalledWith([], {
			action: 'pop-value',
			name: 'test-input-name',
			removedValue: OPTIONS[0],
		});
	},
);

upstreamTest(
	'should call not call onChange on hitting backspace when backspaceRemovesValue is true and isMulti is true and there are no values',
	function ignoresEmptyMultiBackspace() {
		const onChange = vi.fn();
		const result = renderSelect({
			backspaceRemovesValue: true,
			isClearable: true,
			isMulti: true,
			onChange,
		});
		fireEvent.keyDown(selectControl(result.container), { keyCode: 8, key: 'Backspace' });
		expect(onChange).not.toHaveBeenCalled();
	},
);

function assertAriaAttribute(
	isMulti: boolean,
	name: string,
	value: string | boolean,
	expected: string,
): void {
	const result = renderSelect({ [name]: value, isMulti });
	expect(inputFor(result.container).getAttribute(name)).toBe(expected);
}

upstreamTest(
	'accessibility > passes through aria-labelledby prop single select > should pass aria-labelledby prop down to input',
	function labelsSingleInput() {
		assertAriaAttribute(false, 'aria-labelledby', 'testing', 'testing');
	},
);

upstreamTest(
	'accessibility > passes through aria-labelledby prop multi select > should pass aria-labelledby prop down to input',
	function labelsMultiInput() {
		assertAriaAttribute(true, 'aria-labelledby', 'testing', 'testing');
	},
);

upstreamTest(
	'accessibility > passes through aria-errormessage prop single select > should pass aria-errormessage prop down to input',
	function describesSingleInputError() {
		assertAriaAttribute(false, 'aria-errormessage', 'error-message', 'error-message');
	},
);

upstreamTest(
	'accessibility > passes through aria-errormessage prop multi select > should pass aria-errormessage prop down to input',
	function describesMultiInputError() {
		assertAriaAttribute(true, 'aria-errormessage', 'error-message', 'error-message');
	},
);

upstreamTest(
	'accessibility > passes through aria-invalid prop single select > should pass aria-invalid prop down to input',
	function invalidatesSingleInput() {
		assertAriaAttribute(false, 'aria-invalid', true, 'true');
	},
);

upstreamTest(
	'accessibility > passes through aria-invalid prop multi select > should pass aria-invalid prop down to input',
	function invalidatesMultiInput() {
		assertAriaAttribute(true, 'aria-invalid', true, 'true');
	},
);

upstreamTest(
	'accessibility > passes through aria-label prop single select > should pass aria-labelledby prop down to input',
	function ariaLabelsSingleInput() {
		assertAriaAttribute(false, 'aria-label', 'testing', 'testing');
	},
);

upstreamTest(
	'accessibility > passes through aria-label prop multi select > should pass aria-labelledby prop down to input',
	function ariaLabelsMultiInput() {
		assertAriaAttribute(true, 'aria-label', 'testing', 'testing');
	},
);

upstreamTest(
	'closeMenuOnSelect prop > when passed as false it should not call onMenuClose on selecting option',
	function keepsMenuOpenOnSelect() {
		const onMenuClose = vi.fn();
		const result = renderSelect({
			blurInputOnSelect: false,
			closeMenuOnSelect: false,
			menuIsOpen: true,
			onMenuClose,
		});
		fireEvent.click(optionWithText(result.container, '0'));
		expect(onMenuClose).not.toHaveBeenCalled();
	},
);
