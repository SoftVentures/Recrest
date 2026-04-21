import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/molecules/compounds/Tooltip";
import { TruncatedTooltip } from "@/components/molecules/compounds/TruncatedTooltip";

/**
 * jsdom does not perform layout, so `scrollWidth` and `clientWidth` are both
 * `0` by default. We stub them on `HTMLElement.prototype` to simulate the
 * two relevant states.
 */
function stubWidths(scroll: number, client: number) {
  Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
    configurable: true,
    get() {
      return scroll;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get() {
      return client;
    },
  });
}

beforeEach(() => {
  // Minimal ResizeObserver stub — our hook only uses observe/disconnect.
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    disconnect() {}
    unobserve() {}
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TruncatedTooltip", () => {
  it("renders the child as-is when text is not truncated", () => {
    stubWidths(50, 100); // scroll <= client → not truncated
    render(
      <TooltipProvider>
        <TruncatedTooltip content="Full label">
          <span data-testid="tt-child">short</span>
        </TruncatedTooltip>
      </TooltipProvider>,
    );
    const child = screen.getByTestId("tt-child");
    expect(child).toBeInTheDocument();
    // Radix adds `data-state` to its Trigger. A bare child has none.
    expect(child.getAttribute("data-state")).toBeNull();
  });

  it("wraps the child in a tooltip trigger when text overflows", () => {
    stubWidths(200, 100); // scroll > client → truncated
    render(
      <TooltipProvider>
        <TruncatedTooltip content="Full very long label that overflows">
          <span data-testid="tt-child">overflowing</span>
        </TruncatedTooltip>
      </TooltipProvider>,
    );
    const child = screen.getByTestId("tt-child");
    // Radix Tooltip.Trigger sets `data-state="closed"` on the trigger element
    // until hovered/focused. Its presence confirms the wrapping kicked in.
    expect(child.getAttribute("data-state")).toBe("closed");
  });

  it("renders children as-is when content is empty", () => {
    stubWidths(200, 100); // would normally trigger tooltip
    render(
      <TooltipProvider>
        <TruncatedTooltip content="">
          <span data-testid="tt-child">whatever</span>
        </TruncatedTooltip>
      </TooltipProvider>,
    );
    const child = screen.getByTestId("tt-child");
    expect(child.getAttribute("data-state")).toBeNull();
  });
});
