import { describe, expect, it, vi } from 'vitest';
import { mount, nextPaint } from '../../../octane/tests/_helpers';
import { DropzoneApp } from '../_fixtures/dropzone.tsrx';

describe('@octanejs/mantine-dropzone', () => {
	it('accepts native dropped files', async () => {
		const onDrop = vi.fn();
		const result = mount(DropzoneApp, { onDrop });
		const root = result.container.querySelector('[data-idle]') as HTMLElement;
		const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
		const event = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
		Object.defineProperty(event, 'dataTransfer', { value: { files: [file] } });
		root.dispatchEvent(event);
		await Promise.resolve();
		await nextPaint();
		expect(onDrop).toHaveBeenCalledWith([file]);
		result.unmount();
	});
});
