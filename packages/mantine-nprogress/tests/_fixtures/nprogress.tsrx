import { MantineProvider } from '@octanejs/mantine-core';
import { NavigationProgress, nprogress } from '@octanejs/mantine-nprogress';

export function NprogressApp() @{
	<MantineProvider>
		<button id="set" onClick={() => nprogress.set(42)}>Set progress</button>
		<NavigationProgress withinPortal={false} stepInterval={0} />
	</MantineProvider>
}
