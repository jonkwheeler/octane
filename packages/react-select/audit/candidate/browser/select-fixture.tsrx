import Select from '../../../src/index';
import type { ActionMeta, InputActionMeta, OnChangeValue } from '../../../src/types';

export type BrowserSelectOption = { label: string; value: string; disabled?: boolean };

export function BrowserSelectFixture(props: {
	options: readonly BrowserSelectOption[];
	onChange: (
		value: OnChangeValue<BrowserSelectOption, false>,
		actionMeta: ActionMeta<BrowserSelectOption>,
	) => void;
	onInputChange: (value: string, actionMeta: InputActionMeta) => string;
	onMenuClose: () => void;
	onMenuOpen: () => void;
}) @{
	<Select
		{...props}
		instanceId="browser"
		name="choice"
		isOptionDisabled={(option) => Boolean(option.disabled)}
	/>
}
