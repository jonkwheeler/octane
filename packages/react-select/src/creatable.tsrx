export { useCreatable } from './use-creatable.tsrx';
export type {
	Accessors,
	CreatableAdditionalProps,
	CreatableBaseProps as CreatableProps,
} from './use-creatable.tsrx';

import { Select, type SelectProps } from './select.tsrx';
import {
	useCreatable,
	type CreatableAdditionalProps,
	type CreatableBaseProps,
} from './use-creatable.tsrx';
import { useStateManager, type StateManagerProps } from './use-state-manager.tsrx';
import type { GroupBase } from './types';

function CreatableSelect<
	Option = unknown,
	IsMulti extends boolean = false,
	Group extends GroupBase<Option> = GroupBase<Option>,
>(props: StateManagerProps<Option, IsMulti, Group> & CreatableAdditionalProps<Option, Group>) @{
	const stateProps = useStateManager<Option, IsMulti, Group>(props);
	const creatableProps = useCreatable(
		stateProps as CreatableBaseProps<Option, IsMulti, Group>,
	);
	<Select {...(creatableProps as SelectProps<Option, IsMulti, Group>)} />
}

export default CreatableSelect;
