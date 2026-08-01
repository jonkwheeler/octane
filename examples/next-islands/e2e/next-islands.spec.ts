import { expect, test } from '@playwright/test';

test('keeps the React shell while the Octane leaf becomes interactive', async ({ page }) => {
	await page.goto('/');

	await expect(page.getByText('Rendered by the Next.js React shell')).toBeVisible();
	await expect(page.getByText('Rendered by an Octane TSRX island: 1')).toBeVisible();

	await page.getByRole('button', { name: 'Increment' }).click();

	await expect(page.getByText('Rendered by an Octane TSRX island: 2')).toBeVisible();
});

test('runs a migrated Recharts leaf through the hosted Octane root', async ({ page }) => {
	await page.goto('/');

	const chart = page.getByRole('region', { name: 'Migrated sales chart' });
	await expect(chart.getByText('Top value: 400')).toBeVisible();
	await expect(chart.locator('svg')).toBeVisible();
	await expect(chart.locator('.recharts-rectangle')).toHaveCount(3);

	await chart.getByRole('button', { name: 'Load current data' }).click();

	await expect(chart.getByText('Top value: 520')).toBeVisible();
	await expect(chart.locator('.recharts-rectangle')).toHaveCount(3);
});

test('runs a migrated Tiptap editor through the hosted Octane root', async ({ page }) => {
	await page.goto('/');

	const editor = page.getByRole('region', { name: 'Migrated rich text editor' });
	const proseMirror = editor.locator('.ProseMirror');
	await expect(proseMirror).toContainText('Hello from the React application');

	await editor.getByRole('button', { name: 'Replace content' }).click();
	await expect(proseMirror).toContainText('Edited by the Octane Tiptap binding');

	await proseMirror.click();
	await page.keyboard.press('End');
	await page.keyboard.type('!');
	await expect(proseMirror).toContainText('Edited by the Octane Tiptap binding!');
});
