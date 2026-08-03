import Select from '../../src/index';
import type { ActionMeta, OnChangeValue } from '../../src/types';
import type { BrowserSelectOption } from './select-fixture.tsrx';

export function MultiSelectFixture(props: {
	options: readonly BrowserSelectOption[];
	defaultValue: readonly BrowserSelectOption[];
	onChange: (value: OnChangeValue<BrowserSelectOption, true>, actionMeta: ActionMeta<
		BrowserSelectOption
	>) => void;
}) @{
	<Select {...props} instanceId="multi-browser" isMulti={true} name="multi-choice" />
}
