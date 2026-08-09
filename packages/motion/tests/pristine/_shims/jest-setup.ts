import '@testing-library/jest-dom/vitest';
import { render as testRender } from '@testing-library/react';
import { act } from 'react';
import { vi } from 'vitest';

if (!(globalThis as { jest?: unknown }).jest) {
	(globalThis as { jest: { fn: typeof vi.fn } }).jest = { fn: vi.fn };
}

export function render(ui: Parameters<typeof testRender>[0]) {
	let result!: ReturnType<typeof testRender>;
	act(function renderUi() {
		result = testRender(ui);
	});
	return result;
}
