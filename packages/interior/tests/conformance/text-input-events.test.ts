import { afterEach, describe, expect, it } from 'vitest';
import { flushSync } from 'octane';
import { flushEffects, mount } from '../../../octane/tests/_helpers';
import {
	ExpandingSearchProbe,
	OtpInputProbe,
	TagInputProbe,
} from '../_fixtures/text-input-probes.tsrx';

function typeInput(input: HTMLInputElement, text: string): void {
	input.focus();
	flushSync(function dispatchInput() {
		input.value = text;
		input.dispatchEvent(
			new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }),
		);
	});
}

function pressEnter(input: HTMLInputElement): void {
	flushSync(function dispatchEnter() {
		input.dispatchEvent(
			new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }),
		);
	});
}

describe('@octanejs/interior — native text input events', () => {
	let root: ReturnType<typeof mount> | undefined;

	afterEach(function cleanup() {
		root?.unmount();
		root = undefined;
	});

	it('ExpandingSearch updates query on native input events', () => {
		root = mount(ExpandingSearchProbe);
		flushEffects();
		flushSync(function flush() {});

		const input = root.container.querySelector('input[type="search"]');
		expect(input).not.toBeNull();

		typeInput(input as HTMLInputElement, 'octane');
		flushEffects();
		flushSync(function flush() {});

		expect(root.container.querySelector('[data-testid="query"]')?.textContent).toBe('octane');
		expect((input as HTMLInputElement).value).toBe('octane');
	});

	it('TagInput tracks draft and commits tags from native input events', () => {
		root = mount(TagInputProbe);
		flushEffects();
		flushSync(function flush() {});

		const input = root.container.querySelector('input[type="text"]');
		expect(input).not.toBeNull();

		typeInput(input as HTMLInputElement, 'alpha');
		flushEffects();
		flushSync(function flush() {});

		expect((input as HTMLInputElement).value).toBe('alpha');

		pressEnter(input as HTMLInputElement);
		flushEffects();
		flushSync(function flush() {});

		expect(root.container.querySelector('[data-testid="tags"]')?.textContent).toBe('alpha');
	});

	it('OtpInput accepts characters from native input events', () => {
		root = mount(OtpInputProbe);
		flushEffects();
		flushSync(function flush() {});

		const cells = Array.from(root.container.querySelectorAll('input[type="text"]'));
		expect(cells.length).toBeGreaterThanOrEqual(4);

		typeInput(cells[0] as HTMLInputElement, '1');
		typeInput(cells[1] as HTMLInputElement, '2');
		flushEffects();
		flushSync(function flush() {});

		expect(root.container.querySelector('[data-testid="code"]')?.textContent).toBe('12');
	});
});
