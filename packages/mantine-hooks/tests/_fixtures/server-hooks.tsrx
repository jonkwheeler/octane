import { useCounter, useDisclosure, useListState, useMediaQuery } from '@octanejs/mantine-hooks';

export function ServerHooks() @{
	const [count] = useCounter(2);
	const [opened] = useDisclosure(true);
	const [items] = useListState(['Ada', 'Grace']);
	const wide = useMediaQuery('(min-width: 60rem)', false);

	<output>{`${count}:${opened ? 'open' : 'closed'}:${items.join(',')}:${
		wide ? 'wide' : 'narrow'
	}`}</output>
}
