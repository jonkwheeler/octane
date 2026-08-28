import { useCallback, useMemo, useState, useEffect } from 'octane';
import { mapCode } from './parseHotkeys';

export default function useRecordHotkeys(useKey = false, blacklist: string[] = []) {
	// Compiled custom-hook calls append a private slot symbol after the user's arguments.
	const resolvedUseKey = typeof useKey === 'symbol' ? false : useKey;
	const resolvedBlacklist = typeof blacklist === 'symbol' ? [] : blacklist;

	const [keys, setKeys] = useState(new Set<string>());
	const [isRecording, setIsRecording] = useState(false);

	const blacklistSet = useMemo(() => {
		return new Set(resolvedBlacklist.map((k) => k.toLowerCase()));
	}, [resolvedBlacklist]);

	const handler = useCallback(
		(event: KeyboardEvent) => {
			if (event.code === undefined) {
				// Synthetic event (e.g., Chrome autofill). Ignore.
				return;
			}

			const mappedKey = mapCode(resolvedUseKey ? event.key : event.code).toLowerCase();

			// Do not interfere with keys present in the blacklist – allow them to work normally.
			if (blacklistSet.has(mappedKey)) {
				return;
			}

			// Prevent the default behaviour for recorded keys so they don't interfere with the UI.
			event.preventDefault();
			event.stopPropagation();

			setKeys((prev) => {
				const newKeys = new Set(prev);

				newKeys.add(mappedKey);

				return newKeys;
			});
		},
		[resolvedUseKey, blacklistSet],
	);

	const stop = useCallback(() => {
		setIsRecording(false);
	}, []);

	const start = useCallback(() => {
		setKeys(new Set<string>());
		setIsRecording(true);
	}, []);

	const resetKeys = useCallback(() => {
		setKeys(new Set<string>());
	}, []);

	useEffect(() => {
		if (typeof document !== 'undefined' && isRecording) {
			document.addEventListener('keydown', handler);

			return () => {
				document.removeEventListener('keydown', handler);
			};
		}
	}, [isRecording, handler]);

	return [keys, { start, stop, resetKeys, isRecording }] as const;
}
