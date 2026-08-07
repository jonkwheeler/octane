import { describe, expect, it } from 'vitest';
import * as binding from '@octanejs/interior';

describe('@octanejs/interior — exports', () => {
	it('exports ported interior.dev components', () => {
		expect(typeof binding.CopyButton).toBe('function');
		expect(typeof binding.useCopyToClipboard).toBe('function');
		expect(typeof binding.TypingIndicator).toBe('function');
		expect(typeof binding.Drawer).toBe('function');
		expect(typeof binding.LoadingButton).toBe('function');
	});
});
