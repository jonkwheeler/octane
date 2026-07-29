import { Button, MantineProvider, NumberFormatter, Stepper } from '@octanejs/mantine-core';

export function ServerCore() @{
	<MantineProvider>
		<Button>Server button</Button>
		<NumberFormatter value={12345} thousandSeparator />
		<Stepper active={1}>
			<Stepper.Step label="Server first">First content</Stepper.Step>
			<Stepper.Step label="Server second">
				<span id="server-active-step">Second content</span>
			</Stepper.Step>
			<Stepper.Completed>Server complete</Stepper.Completed>
		</Stepper>
	</MantineProvider>
}
