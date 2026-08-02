// Fidelity: exact pinned upstream test identities and assertions; imports and runtime harness are Octane-adapted.
import { renderHook } from "@octanejs/testing-library";
import { describe, expect, test, vi } from "vitest";
import { useMergedRefs } from "../../../src/hooks/useMergedRefs";

describe("useMergedRefs", () => {
  test("should support ref objects and callback refs", () => {
    const callbackRef = vi.fn();
    const refObject: { current: HTMLDivElement | null } = { current: null };

    const { result } = renderHook(() => useMergedRefs(callbackRef, refObject));

    expect(callbackRef).not.toHaveBeenCalled();
    expect(refObject.current).toBe(null);

    const div = document.createElement("div");
    result.current(div);

    expect(callbackRef).toHaveBeenCalledTimes(1);
    expect(callbackRef).toHaveBeenCalledWith(div);
    expect(refObject.current).toBe(div);

    result.current(null);

    expect(callbackRef).toHaveBeenCalledTimes(2);
    expect(callbackRef).toHaveBeenCalledWith(null);
    expect(refObject.current).toBe(null);
  });

  test("should gracefully ignore undefined refs", () => {
    const { result } = renderHook(() => useMergedRefs(undefined));

    const div = document.createElement("div");
    result.current(div);
  });
});
