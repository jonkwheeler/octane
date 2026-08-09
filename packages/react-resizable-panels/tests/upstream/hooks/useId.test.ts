// Fidelity: exact pinned upstream test identities and assertions; imports and runtime harness are Octane-adapted.
import { renderHook } from '@octanejs/testing-library';
import { describe, expect, test } from 'vitest';
import { useId } from '../../../src/hooks/useId';

describe('useId', () => {
	test('should prefer explicit id', () => {
		const { result } = renderHook(() => useId('abc'));

		expect(result.current).toBe('abc');
	});

	test('should fallback ot React useId', () => {
		const { result } = renderHook(() => useId(undefined));
		// OCTANE DIVERGENCE[react-resizable-panels-useId-fallback][runtime:react-resizable-panels:0415]: Upstream mocks React.useId to `:r123:`; Octane's fallback is framework-owned and cannot honor that mock, so this case asserts a non-empty string instead of exact equality.
		expect(result.current).toEqual(expect.any(String));
		expect(result.current.length).toBeGreaterThan(0);
	});
});
