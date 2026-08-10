import '@testing-library/jest-dom/vitest';
import { render as testRender } from '@testing-library/react';
import { act, Fragment, StrictMode, type ReactNode } from 'react';
import { vi } from 'vitest';

if (!(globalThis as { jest?: unknown }).jest) {
	(globalThis as { jest: { fn: typeof vi.fn } }).jest = { fn: vi.fn };
}

export function render(children: ReactNode, isStrict = true) {
	const Wrapper = isStrict ? StrictMode : Fragment;
	const renderReturn = testRender(<Wrapper>{children}</Wrapper>);

	return {
		...renderReturn,
		rerender: function rerender(next: ReactNode) {
			return renderReturn.rerender(<Wrapper>{next}</Wrapper>);
		},
	};
}
