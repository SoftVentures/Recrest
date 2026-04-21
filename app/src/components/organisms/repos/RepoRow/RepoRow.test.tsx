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
    // Repo name fixture is "recrest" — testid-based to avoid text coupling.
    expect(screen.getByTestId("repo-row-name")).toHaveTextContent("recrest");
  });

  it("marks the row as selected", () => {
    mount(vi.fn(), true);
    expect(screen.getByTestId("repo-row")).toHaveAttribute("data-selected", "true");
  });

  it("does not mark the row as selected when unselected", () => {
    mount(vi.fn(), false);
    expect(screen.getByTestId("repo-row")).not.toHaveAttribute("data-selected");
  });
});
