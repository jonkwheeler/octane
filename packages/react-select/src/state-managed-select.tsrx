import { Select, type SelectProps } from './select.tsrx';
import { useStateManager, type StateManagerProps } from './use-state-manager.tsrx';

export type Props<Option = unknown, IsMulti extends boolean = boolean> =
	StateManagerProps<Option, IsMulti> & SelectProps<Option, IsMulti>;

export function StateManagedSelect<Option = unknown, IsMulti extends boolean = false>(
	props: Props<Option, IsMulti>,
) @{
	const selectProps = useStateManager<Option, IsMulti>(props);
	<Select {...(selectProps as SelectProps<Option, IsMulti>)} />
}
