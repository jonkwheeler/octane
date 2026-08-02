import { useContext } from 'octane';
import { GroupContext } from './GroupContext';

export function useGroupContext(_slot?: symbol) {
	const value = useContext(GroupContext);
	if (value === null) throw new Error('Panel and Separator components must be rendered within a Group');
	return value;
}
