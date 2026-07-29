import { describe, expect, it } from 'vitest';
import { mount, nextPaint } from '../../../octane/tests/_helpers';
import { RichTextEditorApp } from '../_fixtures/rich-text-editor.tsrx';

describe('@octanejs/mantine-tiptap', () => {
	it('renders a real Tiptap editor and Mantine toolbar', async () => {
		const result = mount(RichTextEditorApp, {});
		await nextPaint();
		expect(result.container.textContent).toContain('Hello Mantine editor');
		expect(result.container.querySelector('[contenteditable="true"]')).not.toBeNull();
		expect(result.container.querySelector('button')).not.toBeNull();
		result.unmount();
	});
});
