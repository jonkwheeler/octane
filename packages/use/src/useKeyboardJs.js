import { useEffect, useState } from 'octane';

const normalizeKey = (key) => key.toLowerCase().replace('control', 'ctrl').replace(' ', 'space');

const useKeyboardJs = (combination) => {
	const [state, setState] = useState([false, null]);
	useEffect(() => {
		if (typeof window === 'undefined') return;
		const expected = combination
			.toLowerCase()
			.split('+')
			.map((key) => key.trim());
		const matches = (event) => {
			const key = normalizeKey(event.key);
			return expected.every((part) => {
				if (part === 'ctrl') return event.ctrlKey;
				if (part === 'shift') return event.shiftKey;
				if (part === 'alt') return event.altKey;
				if (part === 'meta' || part === 'command') return event.metaKey;
				return part === key;
			});
		};
		const down = (event) => matches(event) && setState([true, event]);
		const up = (event) => matches(event) && setState([false, event]);
		window.addEventListener('keydown', down);
		window.addEventListener('keyup', up);
		return () => {
			window.removeEventListener('keydown', down);
			window.removeEventListener('keyup', up);
		};
	}, [combination]);
	return state;
};

export default useKeyboardJs;
