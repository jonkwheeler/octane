import { createStore, useStore } from '@octanejs/mantine-store';

const counterStore = createStore({ count: 0 });

export function StoreApp() @{
	const state = useStore(counterStore);
	<button id="increment" onClick={() => counterStore.setState({ count: state.count + 1 })}>
		{state.count}
	</button>
}
