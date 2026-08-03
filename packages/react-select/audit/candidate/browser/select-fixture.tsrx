import Select from '../../../src/index';
import type { ActionMeta, InputActionMeta, OnChangeValue } from '../../../src/types';

export type BrowserSelectOption = { label: string; value: string; disabled?: boolean };

export function BrowserSelectFixture(props: {
	autoFocus?: boolean;
	options: readonly BrowserSelectOption[];
	onChange: (
		value: OnChangeValue<BrowserSelectOption, false>,
		actionMeta: ActionMeta<BrowserSelectOption>,
	) => void;
	onInputChange: (value: string, actionMeta: InputActionMeta) => string;
	onMenuClose: () => void;
	onMenuOpen: () => void;
	required?: boolean;
	menuIsOpen?: boolean;
	menuPlacement?: 'auto' | 'bottom' | 'top';
	menuShouldScrollIntoView?: boolean;
	menuShouldBlockScroll?: boolean;
	captureMenuScroll?: boolean;
	onMenuScrollToBottom?: (event: WheelEvent | TouchEvent) => void;
	onMenuScrollToTop?: (event: WheelEvent | TouchEvent) => void;
}) @{
	<Select
		{...props}
		instanceId="browser"
		name="choice"
		isOptionDisabled={(option) => Boolean(option.disabled)}
	/>
}
