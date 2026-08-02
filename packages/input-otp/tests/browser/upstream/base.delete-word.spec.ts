import { expect, it } from 'vitest';
import { page, setupBrowser } from '../_browser';

setupBrowser();

it('should backspace previous word (even if there is not a selected character)', async () => {
	const input = page.getByRole('textbox');
	await input.pressSequentially('1234');
	await input.press('Control+Backspace');
	expect(await input.inputValue()).toBe('');
});

it('should backspace selected char', async () => {
	const input = page.getByRole('textbox');
	await input.pressSequentially('123456');
	await input.press('ArrowLeft'); await input.press('ArrowLeft'); await input.press('Control+Backspace');
	expect(await input.inputValue()).toBe('12356');
});

it('should forward-delete character when pressing delete', async () => {
	const input = page.getByRole('textbox');
	await input.pressSequentially('123456');
	await input.press('Delete');
	expect(await input.inputValue()).toBe('12345');
	for (let index = 0; index < 5; index++) await input.press('ArrowLeft');
	await input.press('Delete');
	expect(await input.inputValue()).toBe('2345');
	await input.press('ArrowRight'); await input.press('ArrowRight'); await input.press('Delete');
	expect(await input.inputValue()).toBe('235');
});
