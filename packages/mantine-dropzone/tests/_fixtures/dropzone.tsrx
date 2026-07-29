import { MantineProvider } from '@octanejs/mantine-core';
import { Dropzone } from '@octanejs/mantine-dropzone';

export function DropzoneApp({ onDrop }: { onDrop: (files: File[]) => void }) @{
	<MantineProvider>
		<Dropzone onDrop={onDrop} accept={['text/plain']} activateOnClick={false}>
			<Dropzone.Idle>Drop a file</Dropzone.Idle>
			<Dropzone.Accept>Accepted</Dropzone.Accept>
			<Dropzone.Reject>Rejected</Dropzone.Reject>
		</Dropzone>
	</MantineProvider>
}
