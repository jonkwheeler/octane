import { MantineProvider } from '@octanejs/mantine-core';
import { ModalsProvider, modals } from '@octanejs/mantine-modals';

export function ModalsApp() @{
	<MantineProvider>
		<ModalsProvider modalProps={{ withinPortal: false, transitionProps: { duration: 0 } }}>
			<button id="open" onClick={() => modals.open({ title: 'Account', children: 'Saved changes' })}>
				Open modal
			</button>
		</ModalsProvider>
	</MantineProvider>
}
