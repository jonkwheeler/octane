import { MantineProvider } from '@octanejs/mantine-core';
import { Dropzone } from '@octanejs/mantine-dropzone';

export function DropzoneApp({
	onDrop,
	disabled = false,
	maxSize,
}: {
	onDrop: (files: File[]) => void;
	disabled?: boolean;
	maxSize?: number;
}) @{
	<MantineProvider>
		<Dropzone
			onDrop={onDrop}
			accept={['text/plain']}
			activateOnClick={false}
			disabled={disabled}
			maxSize={maxSize}
		>
			<Dropzone.Idle>Drop a file</Dropzone.Idle>
			<Dropzone.Accept>Accepted</Dropzone.Accept>
			<Dropzone.Reject>Rejected</Dropzone.Reject>
		</Dropzone>
	</MantineProvider>
}
