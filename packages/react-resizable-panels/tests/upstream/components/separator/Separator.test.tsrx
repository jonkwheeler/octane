// Fidelity: exact pinned upstream test identities and assertions; renderer, refs, profiling instrumentation, imports, and DOM harness are Octane-adapted.
import { render, screen } from "@octanejs/testing-library";
import { cleanup } from "@octanejs/testing-library";
import { afterEach, beforeEach } from "vitest";
import { describe, expect, test, vi } from "vitest";
import { subscribeToMountedGroup } from "../../../../src/global/mutable-state/groups";
import { moveSeparator } from "../../global/test/moveSeparator";
import { setElementBoundsFunction } from "../../utils/test/mockBoundingClientRect";
import { Group } from "../../../../src/components/group/Group.tsrx";
import { Panel } from "../../../../src/components/panel/Panel.tsrx";
import { Separator } from "../../../../src/components/separator/Separator.tsrx";
import { mockBoundingClientRect, unmockBoundingClientRect } from "../../utils/test/mockBoundingClientRect";
import { mockGetComputedStyle, unmockGetComputedStyle } from "../../utils/test/mockGetComputedStyle";
import { mockResizeObserver, unmockResizeObserver } from "../../utils/test/mockResizeObserver";

beforeEach(() => { mockBoundingClientRect(); mockGetComputedStyle(); mockResizeObserver(); });
afterEach(() => { cleanup(); unmockResizeObserver(); unmockGetComputedStyle(); unmockBoundingClientRect(); });

describe("Separator", () => {
  describe("disabled prop", () => {
    test("changes to disabled prop should not cause the Separator to remount", () => {
      const onChange = vi.fn();
      const removeListener = subscribeToMountedGroup("group", onChange);

      const { rerender } = render(
        <Group id="group">
          <Panel />
          <Separator disabled id="left" />
          <Panel />
          <Separator id="right" />
          <Panel />
        </Group>
      );
      expect(onChange).toHaveBeenCalled();

      onChange.mockReset();

      rerender(
        <Group id="group">
          <Panel />
          <Separator id="left" />
          <Panel />
          <Separator disabled id="right" />
          <Panel />
        </Group>
      );
      expect(onChange).not.toHaveBeenCalled();

      removeListener();
    });

    test("changes to this prop should update Separator behavior", async () => {
      setElementBoundsFunction((element) => {
        switch (element.id) {
          case "left": {
            return new DOMRect(0, 0, 50, 50);
          }
          case "separator": {
            return new DOMRect(50, 0, 10, 50);
          }
          case "right": {
            return new DOMRect(60, 0, 50, 50);
          }
        }
      });

      const onLayoutChange = vi.fn();
      const onLayoutChanged = vi.fn();

      const { rerender } = render(
        <Group
          onLayoutChange={onLayoutChange}
          onLayoutChanged={onLayoutChanged}
        >
          <Panel id="left" />
          <Separator id="separator" />
          <Panel id="right" />
        </Group>
      );

      onLayoutChange.mockReset();
      onLayoutChanged.mockReset();

      rerender(
        <Group
          onLayoutChange={onLayoutChange}
          onLayoutChanged={onLayoutChanged}
        >
          <Panel id="left" />
          <Separator disabled id="separator" />
          <Panel id="right" />
        </Group>
      );

      // Resize attempts should be ignored because the Panel is disabled
      await moveSeparator(25);
      expect(onLayoutChange).not.toHaveBeenCalled();
      expect(onLayoutChanged).not.toHaveBeenCalled();
      onLayoutChange.mockReset();
      onLayoutChanged.mockReset();

      rerender(
        <Group
          onLayoutChange={onLayoutChange}
          onLayoutChanged={onLayoutChanged}
        >
          <Panel id="left" />
          <Separator id="separator" />
          <Panel id="right" />
        </Group>
      );

      // Resize attempts should work now that the Panel has been re-enabled
      await moveSeparator(25);
      expect(onLayoutChange).toHaveBeenCalled();
      expect(onLayoutChanged).toHaveBeenCalled();
    });
  });

  describe("HTML attributes", () => {
    test("should expose id and data-testid", () => {
      render(
        <Group>
          <Panel />
          <Separator id="separator" />
          <Panel />
        </Group>
      );

      expect(screen.getByRole("separator").getAttribute("data-testid")).toBe("separator");
      expect(screen.getByRole("separator").getAttribute("id")).toBe("separator");
    });

    test("should pass through ...rest attributes", () => {
      render(
        <Group>
          <Panel />
          <Separator data-foo="abc" data-bar="123" />
          <Panel />
        </Group>
      );

      expect(screen.getByRole("separator").getAttribute("data-foo")).toBe("abc");
      expect(screen.getByRole("separator").getAttribute("data-bar")).toBe("123");
    });

    describe("ARIA attributes", () => {
      test("should identify its primary panel if and only if it has an explicit id", () => {
        render(
          <Group>
            <Panel id="left-panel" />
            <Separator id="left-separator" />
            <Panel />
            <Separator id="right-separator" />
            <Panel />
          </Group>
        );

        expect(screen.getByTestId("left-separator").getAttribute("aria-controls")).toBe("left-panel");
        expect(screen.getByTestId("right-separator").hasAttribute("aria-controls")).toBe(true);
      });
    });
  });
});
