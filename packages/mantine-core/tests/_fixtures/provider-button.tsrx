import {
	Button,
	MantineProvider,
	Modal,
	NumberFormatter,
	Tooltip,
} from '@octanejs/mantine-core';
import { useState } from 'octane';

export function ProviderButton() @{
	const [count, setCount] = useState(0);

	<MantineProvider>
		<Button id="increment" onClick={() => setCount((value) => value + 1)}>Count {count}</Button>
		<NumberFormatter id="formatted" value={12345.6} thousandSeparator decimalScale={2} />
		<Tooltip label="Native tooltip" opened>
			<button id="tooltip-target">Target</button>
		</Tooltip>
		<Modal opened onClose={() => {}} title="Native modal">
			<div id="modal-content">Modal body</div>
		</Modal>
	</MantineProvider>
}
