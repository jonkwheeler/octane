import { useHotkeys, useRecordHotkeys } from '@octanejs/hotkeys-hook';

export function HotkeyWithDefaults(props: { onHotkey: () => void }) @{
	useHotkeys('a', props.onHotkey);

	<div>Listening</div>
}

export function RecorderWithDefaults() @{
	const [keys, { start, stop, isRecording }] = useRecordHotkeys(false);
	const recordedKeys = Array.from(keys).sort().join(',');

	<section>
		<button onClick={start}>Start recording</button>
		<button onClick={stop}>Stop recording</button>
		<output
			data-testid="recorded-keys"
			data-recording={isRecording ? 'true' : 'false'}
		>{recordedKeys}</output>
	</section>
}
