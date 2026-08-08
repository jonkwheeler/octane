import { useState } from 'octane';
import { useHotkey, useHotkeySequence, useHotkeys } from '@octanejs/tanstack-hotkeys';

export function HotkeysParity() {
	const [single, setSingle] = useState(0);
	const [first, setFirst] = useState(0);
	const [second, setSecond] = useState(0);
	const [sequence, setSequence] = useState(0);
	const [enabled, setEnabled] = useState(true);

	useHotkey('Control+K', () => setSingle((value: number) => value + 1), { enabled });
	useHotkeys([
		{ hotkey: 'Control+L', callback: () => setFirst((value: number) => value + 1) },
		{ hotkey: 'Alt+X', callback: () => setSecond((value: number) => value + 1) },
	], {});
	useHotkeySequence(['G', 'G'], () => setSequence((value: number) => value + 1), {});

	return <main id="hotkeys-parity">
		<button id="toggle" onClick={() => setEnabled((value: boolean) => !value)}>
			{'enabled:' + enabled}
		</button>
		<output id="single">{'single:' + single}</output>
		<output id="first">{'first:' + first}</output>
		<output id="second">{'second:' + second}</output>
		<output id="sequence">{'sequence:' + sequence}</output>
	</main>;
}
