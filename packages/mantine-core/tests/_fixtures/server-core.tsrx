import { Button, MantineProvider, NumberFormatter } from '@octanejs/mantine-core';

export function ServerCore() @{
	<MantineProvider>
		<Button>Server button</Button>
		<NumberFormatter value={12345} thousandSeparator />
	</MantineProvider>
}
