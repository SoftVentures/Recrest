import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/molecules/compounds/Tooltip";
import { RepoRow } from "@/components/organisms/repos/RepoRow";
import "@/i18n";
import { store } from "@/store";
import { makeEnrichedRepo } from "@/test-utils/fixtures";

function mount(onSelect = vi.fn(), selected = false) {
  return render(
    <Provider store={store}>
      <TooltipProvider>
        <RepoRow repo={makeEnrichedRepo()} selected={selected} onSelect={onSelect} />
      </TooltipProvider>
    </Provider>,
  );
}

describe("RepoRow", () => {
  it("renders the repo name", () => {
    mount();
    expect(screen.getByText("recrest")).toBeInTheDocument();
  });

  it("marks the row with a .selected class when selected", () => {
    const { container } = mount(vi.fn(), true);
    expect(container.querySelector(".a-row.selected")).not.toBeNull();
  });

  it("does not carry the .selected class when not selected", () => {
    const { container } = mount(vi.fn(), false);
    expect(container.querySelector(".a-row.selected")).toBeNull();
  });
});
