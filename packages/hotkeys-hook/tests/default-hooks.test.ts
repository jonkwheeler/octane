import { cleanup, fireEvent, render, screen } from '@octanejs/testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HotkeyWithDefaults, RecorderWithDefaults } from './_fixtures/default-hooks.tsrx';

afterEach(cleanup);

describe('@octanejs/hotkeys-hook defaults', () => {
	it('registers a hotkey when options are omitted', () => {
		const onHotkey = vi.fn();
		render(HotkeyWithDefaults, { props: { onHotkey } });

		fireEvent.keyDown(document, { key: 'a', code: 'KeyA' });

		expect(onHotkey).toHaveBeenCalledOnce();
	});

	it('records keys when optional configuration is omitted', () => {
		render(RecorderWithDefaults);
		const output = screen.getByTestId('recorded-keys');

		expect(output.getAttribute('data-recording')).toBe('false');
		expect(output.textContent).toBe('');

		fireEvent.click(screen.getByText('Start recording'));
		fireEvent.keyDown(document, { key: 'a', code: 'KeyA' });

		expect(output.getAttribute('data-recording')).toBe('true');
		expect(output.textContent).toBe('a');
	});
});
