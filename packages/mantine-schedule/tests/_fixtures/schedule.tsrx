import { MantineProvider } from '@octanejs/mantine-core';
import { Schedule } from '@octanejs/mantine-schedule';

const events = [{
	id: 'planning',
	title: 'Planning session',
	start: new Date(2026, 6, 29, 10),
	end: new Date(2026, 6, 29, 11),
	color: 'blue',
}];

export function ScheduleApp() @{
	<MantineProvider>
		<Schedule defaultDate="2026-07-29" defaultView="month" events={events} />
	</MantineProvider>
}
