import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";

import { OpenInIdeButton } from "@/components/molecules/OpenInIdeButton";
import { TooltipProvider } from "@/components/molecules/compounds/Tooltip";
import { store } from "@/store";
import { loadDetectedIdes } from "@/store/slices/settingsSlice";

/** Seeds the detected-IDE list without calling into Rust. */
function seedDetected(ids: string[]) {
  store.dispatch({
    type: loadDetectedIdes.fulfilled.type,
    payload: ids,
  });
}

describe("OpenInIdeButton", () => {
  it("renders the generic label and stays disabled when no IDE is detected", () => {
    seedDetected([]);
    render(
      <Provider store={store}>
        <OpenInIdeButton repoId="r1" />
      </Provider>,
    );
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent(/open in ide/i);
  });

  it("renders the IDE name in the label when at least one is detected", () => {
    seedDetected(["cursor"]);
    render(
      <Provider store={store}>
        <OpenInIdeButton repoId="r1" />
      </Provider>,
    );
    const btn = screen.getByRole("button");
    expect(btn).toBeEnabled();
    expect(btn).toHaveTextContent(/open in cursor/i);
  });

  it("renders an icon-only variant without a visible text label", () => {
    seedDetected(["webstorm"]);
    render(
      <Provider store={store}>
        <TooltipProvider delayDuration={0}>
          <OpenInIdeButton repoId="r1" variant="icon" />
        </TooltipProvider>
      </Provider>,
    );
    const btn = screen.getByRole("button");
    // No "Open in …" text leaks into icon-only variants — only the tooltip on
    // title/aria-label carries the copy.
    expect(btn.textContent ?? "").not.toMatch(/open in/i);
  });
});
