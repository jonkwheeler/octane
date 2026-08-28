import { describe, expect, it } from 'vitest';
import { isHotkeyPressed, useHotkeys, useRecordHotkeys } from '../src/index';

describe('@octanejs/hotkeys-hook exports', () => {
	it('exposes the pinned public hook surface', () => {
		expect(useHotkeys).toBeTypeOf('function');
		expect(useRecordHotkeys).toBeTypeOf('function');
		expect(isHotkeyPressed).toBeTypeOf('function');
	});
});
