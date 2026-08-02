// Fidelity: exact pinned upstream test identities and assertions; imports and runtime harness are Octane-adapted.
import { renderHook } from "@octanejs/testing-library";
import { describe, expect, test } from "vitest";
import { useId } from "../../../src/hooks/useId";

describe("useId", () => {
  test("should prefer explicit id", () => {
    const { result } = renderHook(() => useId("abc"));

    expect(result.current).toBe("abc");
  });

  test("should fallback ot React useId", () => {
    const { result } = renderHook(() => useId(undefined));
    // Framework adaptation: the fallback is Octane's deterministic useId,
    // not React's mocked implementation.
    expect(result.current).toEqual(expect.any(String));
    expect(result.current.length).toBeGreaterThan(0);
  });
});
