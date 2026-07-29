import { useCounter, useDisclosure, useListState } from '@octanejs/mantine-hooks';

export function StateHooks() @{
	const [count, counter] = useCounter(1, { min: 0, max: 2 });
	const [opened, disclosure] = useDisclosure(false);
	const [items, itemsHandlers] = useListState(['Ada']);

	<section>
		<output id="count">{count as string}</output>
		<button id="increment" onClick={counter.increment}>increment</button>
		<button id="open" onClick={disclosure.open}>open</button>
		<output id="opened">
			{opened ? 'open' : 'closed'}
		</output>
		<button id="append" onClick={() => itemsHandlers.append('Grace')}>append</button>
		<output id="items">{items.join(',')}</output>
	</section>
}
