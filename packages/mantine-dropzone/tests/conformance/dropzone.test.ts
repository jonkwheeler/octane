import { describe, expect, it, vi } from 'vitest';
import { mount, nextPaint } from '../../../octane/tests/_helpers';
import { DropzoneApp } from '../_fixtures/dropzone.tsrx';

describe('@octanejs/mantine-dropzone', () => {
	function drop(root: HTMLElement, file: File) {
		const event = new Event('drop', { bubbles: true, cancelable: true }) as DragEvent;
		Object.defineProperty(event, 'dataTransfer', { value: { files: [file] } });
		root.dispatchEvent(event);
	}

	it('accepts native dropped files', async () => {
		const onDrop = vi.fn();
		const result = mount(DropzoneApp, { onDrop });
		const root = result.container.querySelector('[data-idle]') as HTMLElement;
		const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
		drop(root, file);
		await Promise.resolve();
		await nextPaint();
		expect(onDrop).toHaveBeenCalledWith([file]);
		result.unmount();
	});

	it('does not process drops while disabled', async () => {
		const onDrop = vi.fn();
		const result = mount(DropzoneApp, { onDrop, disabled: true });
		const root = result.container.querySelector('[data-idle]') as HTMLElement;
		drop(root, new File(['hello'], 'hello.txt', { type: 'text/plain' }));
		await Promise.resolve();
		await nextPaint();
		expect(onDrop).not.toHaveBeenCalled();
		result.unmount();
	});

	it('shows reject feedback for an oversized dragged file', async () => {
		const onDrop = vi.fn();
		const result = mount(DropzoneApp, { onDrop, maxSize: 1 });
		const root = result.container.querySelector('[data-idle]') as HTMLElement;
		const event = new Event('dragenter', { bubbles: true, cancelable: true }) as DragEvent;
		Object.defineProperty(event, 'dataTransfer', {
			value: { files: [new File(['too large'], 'large.txt', { type: 'text/plain' })] },
		});
		root.dispatchEvent(event);
		await nextPaint();
		expect(result.container.textContent).toContain('Rejected');
		result.unmount();
	});
});
