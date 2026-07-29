import { MantineProvider } from '@octanejs/mantine-core';
import { DatePicker } from '@octanejs/mantine-dates';

export function DatesApp() @{
	<MantineProvider>
		<DatePicker defaultDate="2026-07-01" value="2026-07-29" />
	</MantineProvider>
}
