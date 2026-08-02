// Fidelity: exact pinned upstream test identities and assertions; renderer, refs, profiling instrumentation, imports, and DOM harness are Octane-adapted.
import { act, render } from "@octanejs/testing-library";
import { cleanup } from "@octanejs/testing-library";
import { afterEach, beforeEach } from "vitest";
import { describe, expect, test, vi } from "vitest";
import { getRegisteredGroup } from "../../../../src/global/mutable-state/groups";
import { moveSeparator } from "../../global/test/moveSeparator";
import { assert } from "../../../../src/utils/assert";
import {
  setDefaultElementBounds,
  setElementBoundsFunction
} from "../../utils/test/mockBoundingClientRect";
import { Group } from "../../../../src/components/group/Group.tsrx";
import type { GroupImperativeHandle } from "../../../../src/components/group/types";
import { Separator } from "../../../../src/components/separator/Separator.tsrx";
import { Panel } from "../../../../src/components/panel/Panel.tsrx";
import { mockBoundingClientRect, unmockBoundingClientRect } from "../../utils/test/mockBoundingClientRect";
import { mockGetComputedStyle, unmockGetComputedStyle } from "../../utils/test/mockGetComputedStyle";
import { mockResizeObserver, unmockResizeObserver } from "../../utils/test/mockResizeObserver";

function createRef<Value>() { return { current: null as Value | null }; }
beforeEach(() => { mockBoundingClientRect(); mockGetComputedStyle(); mockResizeObserver(); });
afterEach(() => { cleanup(); unmockResizeObserver(); unmockGetComputedStyle(); unmockBoundingClientRect(); });

describe("Panel", () => {
  describe("disabled prop", () => {
    test("changes to disabled prop should not cause the Panel to remount", () => {
      const { rerender } = render(
        <Group id="group">
          <Panel disabled id="a" />
          <Panel id="b" />
        </Group>
      );

      const { panels: panelsMounted } = getRegisteredGroup("group", true);

      rerender(
        <Group id="group">
          <Panel id="a" />
          <Panel disabled id="b" />
        </Group>
      );

      const { panels: panelsUpdated } = getRegisteredGroup("group", true);

      expect(panelsMounted).toBe(panelsUpdated);
    });

    test("changes to this prop should update Panel behavior", async () => {
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
          <Panel disabled id="left" />
          <Separator id="separator" />
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

  test("should throw if rendered outside of a Group", () => {
    expect(() => render(<Panel />)).toThrow(
      "Group Context not found; did you render a Panel or Separator outside of a Group?"
    );
  });

  describe("memoization", () => {
    test("Panels contents should not re-render on Group layout change", () => {
      const onPanelChildrenRender = vi.fn();

      const groupRef = createRef<GroupImperativeHandle>();

      function Child() {
        onPanelChildrenRender();
        return <div />;
      }

      setDefaultElementBounds(new DOMRect(0, 0, 100, 50));

      render(
        <Group groupRef={groupRef}>
          <Panel id="left" />
          <Panel id="right"><Child /></Panel>
        </Group>
      );

      expect(onPanelChildrenRender).toBeCalled();

      onPanelChildrenRender.mockReset();

      const api = groupRef.current;
      assert(api);

      act(() => {
        api.setLayout({
          left: 25,
          right: 75
        });
      });

      // Octane does not expose React's Profiler component; the parity-relevant
      // invariant is that opaque Panel children are not evaluated again.
      expect(onPanelChildrenRender).not.toBeCalled();
    });
  });

  describe("HTML attributes", () => {
    test("should expose id as testid", () => {
      const { container } = render(
        <Group>
          <Panel id="panel" />
        </Group>
      );

      const panel = container.querySelector("[data-panel]") as HTMLElement;

      expect(panel.getAttribute("data-testid")).toBe("panel");
    });

    test("should pass through ...rest attributes", () => {
      const { container } = render(
        <Group>
          <Panel data-foo="abc" data-bar="123" />
        </Group>
      );

      const panel = container.querySelector("[data-panel]") as HTMLElement;

      expect(panel.getAttribute("data-foo")).toBe("abc");
      expect(panel.getAttribute("data-bar")).toBe("123");
    });

    test("problematic styles should be suppressed", () => {
      const { container } = render(
        <Group>
          <Panel
            style={{
              minHeight: 100,
              maxHeight: 100,
              height: 100,

              minWidth: 100,
              maxWidth: 100,
              width: 100,

              border: "100px solid black",
              borderWidth: 100,
              padding: 100,
              margin: 100
            }}
          />
        </Group>
      );

      const panel = container.querySelector("[data-panel]") as HTMLElement;

      // Octane serializes numeric zero using the CSSOM-normalized px spelling.
      expect(panel.style.minHeight).toBe("0px");
      expect(panel.style.maxHeight).toBe("100%");
      expect(panel.style.height).toBe("auto");

      expect(panel.style.minWidth).toBe("0px");
      expect(panel.style.maxWidth).toBe("100%");
      expect(panel.style.width).toBe("auto");

      expect(panel.style.border).toBe("0px");
      expect(panel.style.borderWidth).toBe("0px");
      expect(panel.style.padding).toBe("0px");
      expect(panel.style.margin).toBe("0px");
    });

    describe("ARIA attributes", () => {
      test("should pass through explicit id prop", () => {
        const { container } = render(
          <Group>
            <Panel id="panel" />
          </Group>
        );

        const panel = container.querySelector("[data-panel]") as HTMLElement;

        expect(panel.getAttribute("data-testid")).toBe("panel");
        expect(panel.getAttribute("id")).toBe("panel");
      });

      test("should assign an id prop to support the ARIA separator", () => {
        const { container } = render(
          <Group>
            <Panel />
          </Group>
        );

        const panel = container.querySelector("[data-panel]") as HTMLElement;

        expect(panel.hasAttribute("data-testid")).toBe(true);
        expect(panel.hasAttribute("id")).toBe(true);
      });
    });
  });
});
