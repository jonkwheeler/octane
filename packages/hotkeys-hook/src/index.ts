import useHotkeys from './useHotkeys';
import type { Options, Keys, HotkeyCallback } from './types';
import { HotkeysProvider, useHotkeysContext } from './HotkeysProvider.tsrx';
import { isHotkeyPressed } from './isHotkeyPressed';
import useRecordHotkeys from './useRecordHotkeys';

export {
	useHotkeys,
	useRecordHotkeys,
	useHotkeysContext,
	isHotkeyPressed,
	HotkeysProvider,
	type Options,
	type Keys,
	type HotkeyCallback,
};
