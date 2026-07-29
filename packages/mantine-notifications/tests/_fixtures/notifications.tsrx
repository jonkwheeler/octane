import { MantineProvider } from '@octanejs/mantine-core';
import { Notifications, notifications } from '@octanejs/mantine-notifications';

export function NotificationsApp() @{
	<MantineProvider>
		<button
			id="show"
			onClick={() => notifications.show({ id: 'welcome', title: 'Welcome', message: 'Ready to go', autoClose: false })}
		>
			Show
		</button>
		<Notifications withinPortal={false} transitionDuration={0} />
	</MantineProvider>
}
