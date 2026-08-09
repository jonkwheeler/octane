// @vitest-environment jsdom

import { cleanup, fireEvent, render } from '@octanejs/testing-library';
import { afterEach, expect } from 'vitest';

import { StateManagedSelect as Select } from '../../src/state-managed-select.tsrx';
import { dropdownIndicator, hiddenInput, inputFor, OPTIONS, upstreamTest } from './helpers';

afterEach(cleanup);

function basicProps(overrides: Record<string, unknown> = {}): never {
	return {
		className: 'react-select',
		classNamePrefix: 'react-select',
		name: 'test-input-name',
		options: OPTIONS,
		...overrides,
	} as never;
}

function menu(container: HTMLElement): Element | null {
	return container.querySelector('.react-select__menu');
}

upstreamTest('passes down the className prop', function passesClassName() {
	const result = render(Select, { props: basicProps() });
	expect(result.container.querySelector('.react-select')).toBeTruthy();
});

upstreamTest(
	'click on dropdown indicator single select > should toggle Menu',
	function togglesSingleMenu() {
		const result = render(Select, { props: basicProps() });
		expect(menu(result.container)).toBeNull();
		fireEvent.mouseDown(dropdownIndicator(result.container), { button: 0 });
		expect(menu(result.container)).toBeTruthy();
		fireEvent.mouseDown(dropdownIndicator(result.container), { button: 0 });
		expect(menu(result.container)).toBeNull();
	},
);

upstreamTest(
	'click on dropdown indicator multi select > should toggle Menu',
	function togglesMultiMenu() {
		const result = render(Select, { props: basicProps({ isMulti: true }) });
		expect(menu(result.container)).toBeNull();
		fireEvent.mouseDown(dropdownIndicator(result.container), { button: 0 });
		expect(menu(result.container)).toBeTruthy();
		fireEvent.mouseDown(dropdownIndicator(result.container), { button: 0 });
		expect(menu(result.container)).toBeNull();
	},
);

upstreamTest(
	'If menuIsOpen prop is passed Menu should not close on clicking Dropdown Indicator',
	function keepsControlledMenuOpen() {
		const result = render(Select, { props: basicProps({ menuIsOpen: true }) });
		expect(menu(result.container)).toBeTruthy();
		fireEvent.mouseDown(dropdownIndicator(result.container), { button: 0 });
		expect(menu(result.container)).toBeTruthy();
	},
);

upstreamTest(
	'defaultMenuIsOpen prop > should open by menu default and clicking on Dropdown Indicator should toggle menu',
	function togglesDefaultOpenMenu() {
		const result = render(Select, { props: basicProps({ defaultMenuIsOpen: true }) });
		expect(menu(result.container)).toBeTruthy();
		fireEvent.mouseDown(dropdownIndicator(result.container), { button: 0 });
		expect(menu(result.container)).toBeNull();
	},
);

upstreamTest('Menu is controllable by menuIsOpen prop', function controlsMenuWithProp() {
	const result = render(Select, { props: basicProps() });
	expect(menu(result.container)).toBeNull();
	result.rerender({ props: basicProps({ menuIsOpen: true }) });
	expect(menu(result.container)).toBeTruthy();
	result.rerender({ props: basicProps({ menuIsOpen: false }) });
	expect(menu(result.container)).toBeNull();
});

upstreamTest(
	'defaultInputValue prop > should update the inputValue on change of input if defaultInputValue prop is provided',
	function updatesDefaultInputValue() {
		const result = render(Select, { props: basicProps({ defaultInputValue: '0' }) });
		const input = inputFor(result.container);
		expect(input.value).toBe('0');
		fireEvent.input(input, { target: { value: '0A' } });
		expect(input.value).toBe('0A');
	},
);

upstreamTest(
	'inputValue prop > should not update the inputValue when on change of input if inputValue prop is provided',
	function preservesControlledInputValue() {
		const result = render(Select, { props: basicProps({ inputValue: '0' }) });
		const input = inputFor(result.container);
		expect(input.value).toBe('0');
		fireEvent.input(input, { target: { value: '0A' } });
		expect(input.value).toBe('0');
	},
);

upstreamTest(
	'defaultValue prop > should update the value on selecting option',
	function updatesDefaultValue() {
		const result = render(Select, {
			props: basicProps({ defaultValue: [OPTIONS[0]], menuIsOpen: true }),
		});
		expect(hiddenInput(result.container).value).toBe('zero');
		const options = result.container.querySelectorAll<HTMLElement>('.react-select__option');
		fireEvent.click(options[1]);
		expect(hiddenInput(result.container).value).toBe('one');
	},
);

upstreamTest(
	'value prop > should not update the value on selecting option',
	function preservesControlledValue() {
		const result = render(Select, {
			props: basicProps({ menuIsOpen: true, value: [OPTIONS[0]] }),
		});
		expect(hiddenInput(result.container).value).toBe('zero');
		const options = result.container.querySelectorAll<HTMLElement>('.react-select__option');
		fireEvent.click(options[1]);
		expect(hiddenInput(result.container).value).toBe('zero');
	},
);

upstreamTest(
	'Integration tests > selecting an option > mouse interaction single select > clicking on an option > should select the clicked option',
	function selectsSingleOptionByMouse() {
		const result = render(Select, { props: basicProps({ menuIsOpen: true }) });
		const options = result.container.querySelectorAll<HTMLElement>('.react-select__option');
		fireEvent.click(options[2], { button: 0 });
		expect(hiddenInput(result.container).value).toBe('two');
	},
);

upstreamTest(
	'Integration tests > selecting an option > mouse interaction multi select > clicking on an option > should select the clicked option',
	function selectsMultiOptionByMouse() {
		const result = render(Select, {
			props: basicProps({ delimiter: ', ', isMulti: true, menuIsOpen: true }),
		});
		const options = result.container.querySelectorAll<HTMLElement>('.react-select__option');
		fireEvent.click(options[2], { button: 0 });
		expect(hiddenInput(result.container).value).toBe('two');
	},
);
