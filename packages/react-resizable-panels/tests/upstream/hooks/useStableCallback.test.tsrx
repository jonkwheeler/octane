// Fidelity: exact pinned upstream test identities and assertions; imports and runtime harness are Octane-adapted.
import { cleanup, fireEvent, render, renderHook, screen } from '@octanejs/testing-library';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { useStableCallback } from '../../../src/hooks/useStableCallback';

afterEach(cleanup);

describe('useStableCallback', () => {
	test('should not execute the callback', () => {
		const fn = vi.fn();
		const { result } = renderHook(() => useStableCallback(fn));

		render(<button onClick={result.current}>Click me</button>);

		expect(fn).not.toHaveBeenCalled();
	});

	test('should call the callback when the event is triggered', () => {
		const fn = vi.fn();
		const { result } = renderHook(() => useStableCallback(fn));

		render(<button onClick={result.current}>Click me</button>);

		fireEvent.click(screen.getByText('Click me'));

		expect(fn).toHaveBeenCalled();
	});
});
