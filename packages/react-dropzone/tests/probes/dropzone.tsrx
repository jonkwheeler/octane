import Dropzone, { useDropzone } from '../../src/index.tsrx';

export function HookProbe(props: { options: any; rootRef: any; inputRef: any }) @{
	const state = useDropzone(props.options);
	<div {...state.getRootProps({ 'data-probe': 'root', ref: props.rootRef })}>
		<input {...state.getInputProps({ 'data-probe': 'input', ref: props.inputRef })} />
		<output>{`${state.acceptedFiles.map((file) => file.name).join(
			',',
		)}|${state.isProcessing}`}</output>
	</div>
}

export function ComponentProbe(props: { options: any; dropzoneRef: any }) @{
	<Dropzone {...props.options} ref={props.dropzoneRef}>
		{(state) => <div {...state.getRootProps({ 'data-probe': 'root' })}>
			<input {...state.getInputProps({ 'data-probe': 'input' })} />
			<span>{String(state.acceptedFiles.length)}</span>
		</div>}
	</Dropzone>
}
