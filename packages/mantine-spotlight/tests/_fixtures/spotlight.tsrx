import { MantineProvider } from '@octanejs/mantine-core';
import { Spotlight } from '@octanejs/mantine-spotlight';

const actions = [
	{ id: 'dashboard', label: 'Dashboard', description: 'Open the dashboard' },
	{ id: 'settings', label: 'Settings', description: 'Manage preferences' },
];

export function SpotlightApp() @{
	<MantineProvider>
		<Spotlight
			actions={actions}
			forceOpened
			withinPortal={false}
			transitionProps={{ duration: 0 }}
			nothingFound="Nothing found"
		/>
	</MantineProvider>
}
