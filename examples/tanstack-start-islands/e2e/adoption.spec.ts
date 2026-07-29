import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('the TanStack Start route hosts an Octane compatibility island', async () => {
	const source = await readFile(new URL('../src/routes/index.tsx', import.meta.url), 'utf8');
	assert.match(source, /OctaneCompat/);
});
